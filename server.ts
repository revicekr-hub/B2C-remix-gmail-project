import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  escapeHtml,
  generateFallbackCampaign,
  isSafeHttpUrl,
  normalizeWebsiteUrl,
  parseRecipientsCsvSmart,
} from './src/utils/serverHelpers';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ============================================================================
// REAL-TIME ENTERPRISE TRACKING & SUPPRESSION STORE (In-Memory + API Ready)
// ============================================================================
interface TrackingEventRecord {
  id: string;
  campaignId: string;
  recipientId?: string;
  email: string;
  type: 'send' | 'open' | 'click' | 'unsubscribe';
  timestamp: string;
  detail?: string;
}

interface CampaignStatsRecord {
  campaignId: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  unsubscribedCount: number;
}

// 1x1 Transparent GIF Buffer for Real Email Open Tracking Pixel
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const DEFAULT_CAMPAIGN_ID = 'camp-b2cmail-default';

const campaignStatsMap = new Map<string, CampaignStatsRecord>([
  [
    DEFAULT_CAMPAIGN_ID,
    {
      campaignId: DEFAULT_CAMPAIGN_ID,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      unsubscribedCount: 0,
    },
  ],
]);

const suppressionList = new Set<string>();
const trackingEvents: TrackingEventRecord[] = [];

function getOrCreateStats(campaignId: string): CampaignStatsRecord {
  const cid = (campaignId || DEFAULT_CAMPAIGN_ID).trim() || DEFAULT_CAMPAIGN_ID;
  let existing = campaignStatsMap.get(cid);
  if (!existing) {
    existing = {
      campaignId: cid,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      unsubscribedCount: 0,
    };
    campaignStatsMap.set(cid, existing);
  }
  return existing;
}

function buildAnalyticsSnapshot(campaignId = DEFAULT_CAMPAIGN_ID) {
  const cid = (campaignId || DEFAULT_CAMPAIGN_ID).trim() || DEFAULT_CAMPAIGN_ID;
  const stats = getOrCreateStats(cid);
  const campaignScopedEvents = trackingEvents
    .filter((e) => e.campaignId === cid)
    .slice(0, 30);

  return {
    campaignId: stats.campaignId,
    sentCount: stats.sentCount,
    openCount: stats.openCount,
    clickCount: stats.clickCount,
    unsubscribedCount: stats.unsubscribedCount,
    totalSuppressedCount: suppressionList.size,
    suppressedEmails: Array.from(suppressionList),
    events: campaignScopedEvents,
  };
}

function personalizeServerText(
  text: string,
  rec: { name: string; email: string; company?: string; voucherCode?: string },
  defaultDiscount = 'VIP2026'
): string {
  if (!text) return '';
  const name = rec.name || rec.email.split('@')[0];
  const company = rec.company || 'Doanh nghiệp Đối tác';
  const voucher = rec.voucherCode || defaultDiscount;
  return text
    .replace(/\{\{\s*(?:Ten_Khach_Hang|name)\s*\}\}/gi, name)
    .replace(/\{\{\s*(?:Ten_Cong_Ty|company)\s*\}\}/gi, company)
    .replace(/\{\{\s*(?:Ma_Uu_Dai|voucher_code)\s*\}\}/gi, voucher)
    .replace(/\{\{\s*email\s*\}\}/gi, rec.email);
}

// ============================================================================
// GEMINI JSON SCHEMA FOR CAMPAIGN GENERATION + DELIVERABILITY AUDIT
// ============================================================================
const campaignResponseSchema = {
  type: Type.OBJECT,
  properties: {
    templates: {
      type: Type.ARRAY,
      description:
        'Danh sách đúng 3 mẫu email marketing theo 3 góc tiếp cận khác nhau, có chèn biến cá nhân hóa {{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}, {{Ma_Uu_Dai}}',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: {
            type: Type.STRING,
            description: 'Tên mẫu email (VD: Mẫu 1: Trực diện & Lợi ích)',
          },
          angle: { type: Type.STRING, description: 'Mô tả ngắn về góc tiếp cận' },
          subject: {
            type: Type.STRING,
            description: 'Tiêu đề email (Subject Line) có chứa {{Ten_Khach_Hang}} hoặc {{Ten_Cong_Ty}}',
          },
          preheader: { type: Type.STRING, description: 'Dòng mô tả xem trước (Preheader)' },
          bodyHtml: {
            type: Type.STRING,
            description:
              'Nội dung email định dạng HTML chuẩn Email (sử dụng table/block tương thích Desktop & Mobile), nhúng màu thương hiệu và biến {{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}, {{Ma_Uu_Dai}}',
          },
          bodyText: { type: Type.STRING, description: 'Nội dung email dạng văn bản thuần' },
          ctaText: { type: Type.STRING, description: 'Chữ trên nút kêu gọi hành động (CTA)' },
          ctaUrl: { type: Type.STRING, description: 'Đường dẫn URL bắt đầu bằng https://' },
          estimatedOpenRate: {
            type: Type.STRING,
            description: 'Tỷ lệ mở ước tính (VD: 41.5%)',
          },
          estimatedCTR: {
            type: Type.STRING,
            description: 'Tỷ lệ click ước tính (VD: 10.8%)',
          },
          keyHighlight: { type: Type.STRING, description: 'Điểm mạnh nhất của mẫu này' },
        },
        required: [
          'id',
          'title',
          'angle',
          'subject',
          'preheader',
          'bodyHtml',
          'bodyText',
          'ctaText',
          'ctaUrl',
          'estimatedOpenRate',
          'estimatedCTR',
          'keyHighlight',
        ],
      },
    },
    sendTimeTip: {
      type: Type.OBJECT,
      description: 'Gợi ý thời điểm gửi tốt nhất dựa trên ngành hàng và hành vi người nhận',
      properties: {
        bestDays: { type: Type.STRING },
        bestHours: { type: Type.STRING },
        explanation: { type: Type.STRING },
        suggestedDateTimeIso: { type: Type.STRING },
        industryInsights: { type: Type.STRING },
      },
      required: [
        'bestDays',
        'bestHours',
        'explanation',
        'suggestedDateTimeIso',
        'industryInsights',
      ],
    },
    deliverabilityAudit: {
      type: Type.OBJECT,
      description: 'Đánh giá độ an toàn hộp thư đến (Spam & Deliverability Audit)',
      properties: {
        spamScore: {
          type: Type.NUMBER,
          description: 'Điểm nguy cơ spam từ 0 đến 100 (càng thấp càng an toàn)',
        },
        riskLevel: {
          type: Type.STRING,
          description: 'low, medium, hoặc high',
        },
        spamWarnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Các nhận xét kiểm tra từ khóa spam, tỷ lệ chữ hoa, link hủy đăng ký',
        },
        mergeTagsUsed: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        hasUnsubscribeLink: { type: Type.BOOLEAN },
      },
      required: [
        'spamScore',
        'riskLevel',
        'spamWarnings',
        'mergeTagsUsed',
        'hasUnsubscribeLink',
      ],
    },
  },
  required: ['templates', 'sendTimeTip', 'deliverabilityAudit'],
};

async function generateContentWithModelFallback(prompt: string) {
  const ai = getAI();
  const primaryModel = 'gemini-2.5-flash';
  const secondaryModel = 'gemini-2.0-flash';

  try {
    return await ai.models.generateContent({
      model: primaryModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: campaignResponseSchema,
        temperature: 0.7,
      },
    });
  } catch (primaryErr) {
    console.warn(
      `Primary model '${primaryModel}' failed, falling back to '${secondaryModel}':`,
      primaryErr
    );
    return await ai.models.generateContent({
      model: secondaryModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: campaignResponseSchema,
        temperature: 0.7,
      },
    });
  }
}

// ============================================================================
// 1. POST /api/campaign/generate - Sinh 03 mẫu email + Deliverability Audit
// ============================================================================
app.post('/api/campaign/generate', async (req, res) => {
  const brandName = String(req.body?.brandName ?? '').trim();
  const offerDetails = String(req.body?.offerDetails ?? '').trim();

  if (!brandName || !offerDetails) {
    return res.status(400).json({
      error: 'Vui lòng nhập đầy đủ Tên thương hiệu và Nội dung ưu đãi / sản phẩm.',
    });
  }

  try {
    const {
      campaignGoal = 'promo',
      industry = 'Thương mại & Dịch vụ',
      tone = 'professional',
      audience = '',
      targetDiscount = '',
      brandColor = '#2563eb',
      websiteUrl: rawWebsiteUrl = '',
      signatureHtml = '',
    } = req.body;

    const normalizedSiteUrl = normalizeWebsiteUrl(rawWebsiteUrl, brandName);

    const goalMap: Record<string, string> = {
      launch: 'Ra mắt sản phẩm / dịch vụ mới',
      promo: 'Khuyến mãi / Ưu đãi kích cầu doanh số',
      care: 'Chăm sóc & Tri ân khách hàng thân thiết',
    };

    const toneMap: Record<string, string> = {
      formal: 'Trang trọng, lịch sự, kính cẩn chuẩn doanh nghiệp B2B/VIP',
      witty: 'Hài hước, dí dỏm, trẻ trung, bắt trend và giàu năng lượng',
      urgent: 'Khẩn cấp (FOMO), thúc đẩy hành động ngay, nhấn mạnh giới hạn thời gian/số lượng',
      professional: 'Chuyên nghiệp, hiện đại, tập trung vào giá trị thực tế và số liệu',
    };

    const prompt = `Bạn là Giám đốc Chiến lược Email Marketing AI của nền tảng B2Cmail (Việt Nam).
Hãy xây dựng chiến dịch Email Marketing gồm ĐÚNG 03 MẪU EMAIL có cấu trúc khác biệt rõ rệt, chèn biến cá nhân hóa động (Merge Tags) và kèm báo cáo kiểm định Spam (Deliverability Audit):

THÔNG TIN ĐẦU VÀO & BRAND KIT:
- Loại chiến dịch: ${goalMap[campaignGoal] || campaignGoal}
- Tên thương hiệu: ${brandName}
- Ngành hàng: ${industry}
- Tông giọng chủ đạo: ${toneMap[tone] || tone}
- Chi tiết ưu đãi / sản phẩm: ${offerDetails}
- Đối tượng khách hàng mục tiêu: ${audience || 'Khách hàng tiềm năng và hiện hữu'}
- Mức ưu đãi / Mã giảm giá: ${targetDiscount || '{{Ma_Uu_Dai}}'}
- Màu nhận diện thương hiệu (Primary Hex): ${brandColor}
- Website đích: ${normalizedSiteUrl}
- Chữ ký công ty (Footer): ${signatureHtml}

YÊU CẦU BẮT BUỘC:
1. Sinh đúng 3 mẫu email với 3 góc tiếp cận:
   - Mẫu 1 (id: "template-1"): Trực diện & Tối ưu lợi ích.
   - Mẫu 2 (id: "template-2"): Kể chuyện & Kết nối cảm xúc.
   - Mẫu 3 (id: "template-3"): Khẩn cấp (FOMO) & Thúc đẩy chuyển đổi.
2. NHÚNG BIẾN CÁ NHÂN HÓA (Merge Tags): Bắt buộc chèn tự nhiên các biến \`{{Ten_Khach_Hang}}\`, \`{{Ten_Cong_Ty}}\`, \`{{Ma_Uu_Dai}}\` vào cả \`subject\`, \`bodyHtml\` và \`bodyText\`.
3. Áp dụng đúng màu thương hiệu \`${brandColor}\` cho nút CTA và điểm nhấn trong \`bodyHtml\`, nhúng chữ ký công ty vào cuối email. Sử dụng bố cục HTML chuẩn Email (dùng \`<table>\` hoặc \`display: block; text-align\`, KHÔNG dùng \`display: flex; justify-content: space-between\` dễ vỡ trên Mobile). Đảm bảo \`ctaUrl\` luôn bắt đầu bằng \`https://\`.
4. Trả về \`deliverabilityAudit\` đánh giá điểm Spam (spamScore từ 8 đến 22) và danh sách kiểm tra Gmail Postmaster.`;

    const response = await generateContentWithModelFallback(prompt);
    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    // Ensure ctaUrl is always valid https://
    if (Array.isArray(parsed.templates)) {
      parsed.templates = parsed.templates.map((tpl: any, idx: number) => ({
        ...tpl,
        ctaUrl: isSafeHttpUrl(tpl.ctaUrl)
          ? tpl.ctaUrl.replace(/^http:\/\//i, 'https://')
          : `${normalizedSiteUrl}/uu-dai-${idx + 1}`,
      }));
    }
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Generate Error, using dynamic fallback:', error?.message || error);
    return res.json(generateFallbackCampaign(req.body));
  }
});

// ============================================================================
// 2. POST /api/campaign/rewrite-tone - Viết lại toàn bộ 3 mẫu theo tông giọng mới
// ============================================================================
app.post('/api/campaign/rewrite-tone', async (req, res) => {
  const newTone = String(req.body?.newTone ?? '').trim();
  const currentTemplates = req.body?.currentTemplates;

  if (!newTone || !Array.isArray(currentTemplates) || currentTemplates.length === 0) {
    return res.status(400).json({
      error:
        'Thiếu thông tin bắt buộc: Vui lòng cung cấp tông giọng mới (newTone) và danh sách mẫu email hiện tại (currentTemplates).',
    });
  }

  try {
    const {
      campaignGoal = 'promo',
      brandName = 'Thương hiệu của bạn',
      industry = 'Thương mại & Dịch vụ',
      offerDetails = 'Chương trình ưu đãi đặc biệt dành cho khách hàng',
      brandColor = '#2563eb',
      websiteUrl: rawWebsiteUrl = '',
      signatureHtml = '',
    } = req.body;

    const normalizedSiteUrl = normalizeWebsiteUrl(rawWebsiteUrl, brandName);

    const toneInstructions: Record<string, string> = {
      formal:
        'TRANG TRỌNG (Formal): Ngôn từ lịch thiệp, kính trọng ("Kính gửi Quý khách", "Trân trọng"), câu văn chuẩn mực, tạo sự tin cậy tuyệt đối.',
      witty:
        'HÀI HƯỚC & THÂN MẬT (Witty): Dí dỏm, duyên dáng, gần gũi, dùng từ ngữ bắt trend thông minh và giàu năng lượng tích cực.',
      urgent:
        'KHẨN CẤP (Urgent / FOMO): Nhịp điệu nhanh, mạnh mẽ, nhấn mạnh tính giới hạn thời gian và suất ưu đãi, thúc đẩy bấm nút CTA ngay lập tức.',
      professional:
        'CHUYÊN NGHIỆP (Professional): Rõ ràng, súc tích, hiện đại, đi thẳng vào giải pháp và lợi ích thực tế.',
    };

    const prompt = `Bạn là Chuyên gia Copywriting Email Marketing AI của B2Cmail.
Hãy VIẾT LẠI (Rewrite) 03 mẫu email dưới đây sang tông giọng mới: ${
      toneInstructions[newTone] || newTone
    }

Thông tin thương hiệu: ${brandName} (Ngành: ${industry})
Chi tiết ưu đãi: ${offerDetails}
Màu thương hiệu: ${brandColor}
Website: ${normalizedSiteUrl}
Chữ ký công ty: ${signatureHtml}
Dữ liệu 3 mẫu hiện tại: ${JSON.stringify(currentTemplates)}

Yêu cầu:
- Thay đổi rõ rệt câu chào, cách dùng từ, cảm xúc trên cả Subject Line, Preheader, Body HTML, Body Text và nút CTA sao cho thể hiện chuẩn xác tông "${newTone}".
- Giữ nguyên các biến cá nhân hóa \`{{Ten_Khach_Hang}}\`, \`{{Ten_Cong_Ty}}\`, \`{{Ma_Uu_Dai}}\` và màu sắc thương hiệu \`${brandColor}\`.
- Dùng bố cục HTML chuẩn Email tương thích cả Desktop & Mobile (không dùng display: flex dễ vỡ). Đảm bảo ctaUrl luôn bắt đầu bằng https://.`;

    const response = await generateContentWithModelFallback(prompt);
    const text = response.text;
    if (!text) throw new Error('Empty rewrite response');
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.templates)) {
      parsed.templates = parsed.templates.map((tpl: any, idx: number) => ({
        ...tpl,
        ctaUrl: isSafeHttpUrl(tpl.ctaUrl)
          ? tpl.ctaUrl.replace(/^http:\/\//i, 'https://')
          : `${normalizedSiteUrl}/uu-dai-${idx + 1}?tone=${encodeURIComponent(newTone)}`,
      }));
    }
    return res.json(parsed);
  } catch (error: any) {
    console.error('Rewrite Tone Error, using dynamic tone fallback:', error?.message || error);
    return res.json(
      generateFallbackCampaign({
        ...req.body,
        tone: newTone,
      })
    );
  }
});

// ============================================================================
// 3. POST /api/campaign/send-simulation - Mô phỏng gửi hàng loạt + Nhúng Tracking Pixel + Unsubscribe
// ============================================================================
app.post('/api/campaign/send-simulation', (req, res) => {
  try {
    const {
      campaignId = DEFAULT_CAMPAIGN_ID,
      brandName = 'Thương hiệu B2Cmail',
      subject = 'Ưu đãi đặc quyền dành cho {{Ten_Khach_Hang}}',
      bodyHtml = '<p>Xin chào {{Ten_Khach_Hang}} tại {{Ten_Cong_Ty}}, mã ưu đãi của bạn là {{Ma_Uu_Dai}}.</p>',
      ctaUrl: rawCtaUrl = '',
      discountCode = 'VIP2026',
      recipients = [],
      csvText = '',
    } = req.body || {};

    const safeCtaUrl = normalizeWebsiteUrl(rawCtaUrl, brandName);

    // Parse recipients from array or order-independent smart CSV parser
    let parsedList: Array<{
      id: string;
      name: string;
      email: string;
      company?: string;
      voucherCode?: string;
    }> = Array.isArray(recipients)
      ? recipients.filter(
          (r: any) => r && typeof r.email === 'string' && r.email.trim().includes('@')
        )
      : [];

    if (typeof csvText === 'string' && csvText.trim()) {
      const csvParsed = parseRecipientsCsvSmart(csvText, discountCode);
      parsedList = [...parsedList, ...csvParsed];
    }

    if (parsedList.length === 0) {
      return res.status(400).json({
        error: 'Vui lòng nhập ít nhất 1 người nhận để chạy mô phỏng',
      });
    }

    const stats = getOrCreateStats(campaignId);
    const deliveries = [];
    let sentNow = 0;
    let skippedSuppressed = 0;

    for (const rec of parsedList) {
      const cleanEmail = (rec.email || '').trim().toLowerCase();
      if (!cleanEmail) continue;

      if (suppressionList.has(cleanEmail)) {
        skippedSuppressed++;
        deliveries.push({
          recipientId: rec.id,
          name: rec.name,
          email: cleanEmail,
          company: rec.company || 'Doanh nghiệp Đối tác',
          voucherCode: rec.voucherCode || discountCode,
          mergedSubject: '',
          mergedHtml: '',
          trackingPixelUrl: '',
          clickTrackUrl: '',
          unsubscribeUrl: '',
          status: 'suppressed' as const,
        });
        continue;
      }

      const mergedSubject = personalizeServerText(subject, rec, discountCode);
      const baseMergedHtml = personalizeServerText(bodyHtml, rec, discountCode);

      const trackingPixelUrl = `/api/track/open?cid=${encodeURIComponent(
        campaignId
      )}&rid=${encodeURIComponent(rec.id)}&email=${encodeURIComponent(cleanEmail)}`;

      const clickTrackUrl = `/api/track/click?cid=${encodeURIComponent(
        campaignId
      )}&rid=${encodeURIComponent(rec.id)}&email=${encodeURIComponent(
        cleanEmail
      )}&url=${encodeURIComponent(safeCtaUrl)}`;

      const unsubscribeUrl = `/api/unsubscribe?cid=${encodeURIComponent(
        campaignId
      )}&email=${encodeURIComponent(cleanEmail)}`;

      const complianceFooterHtml = `
<div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
  Email này được gửi từ hệ thống <strong>${escapeHtml(brandName)}</strong> tới <span style="font-family: monospace;">${escapeHtml(cleanEmail)}</span>.<br/>
  Nếu bạn không muốn nhận thông tin ưu đãi tiếp theo, vui lòng <a href="${unsubscribeUrl}" style="color: #2563eb; text-decoration: underline;">Hủy đăng ký nhận tin (One-Click Unsubscribe)</a>.
  <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</div>`;

      const mergedHtml = `${baseMergedHtml}${complianceFooterHtml}`;

      sentNow++;
      stats.sentCount += 1;

      trackingEvents.unshift({
        id: `ev-send-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        campaignId,
        recipientId: rec.id,
        email: cleanEmail,
        type: 'send',
        timestamp: new Date().toISOString(),
        detail: `Đã gửi kèm Merge Tags (${rec.voucherCode || discountCode}) & Tracking Pixel 1x1`,
      });

      deliveries.push({
        recipientId: rec.id,
        name: rec.name,
        email: cleanEmail,
        company: rec.company || 'Doanh nghiệp Đối tác',
        voucherCode: rec.voucherCode || discountCode,
        mergedSubject,
        mergedHtml,
        trackingPixelUrl,
        clickTrackUrl,
        unsubscribeUrl,
        status: 'sent' as const,
      });
    }

    return res.json({
      campaignId,
      sentCount: sentNow,
      skippedSuppressedCount: skippedSuppressed,
      trackingPixelTemplate: `/api/track/open?cid=${encodeURIComponent(
        campaignId
      )}&rid={{recipientId}}`,
      unsubscribeUrlTemplate: `/api/unsubscribe?cid=${encodeURIComponent(
        campaignId
      )}&email={{email}}`,
      deliveries,
      stats: buildAnalyticsSnapshot(campaignId),
    });
  } catch (err: any) {
    console.error('Send simulation error:', err);
    return res.status(500).json({ error: 'Simulation error' });
  }
});

// ============================================================================
// 4. GET /api/track/open & /api/track/open.gif - Real 1x1 GIF Open Pixel
// ============================================================================
const handleTrackOpen = (req: express.Request, res: express.Response) => {
  const campaignId = (req.query.cid as string) || DEFAULT_CAMPAIGN_ID;
  const recipientId = (req.query.rid as string) || 'rec-live';
  const email = (req.query.email as string) || 'khachhang@congty.vn';

  const stats = getOrCreateStats(campaignId);
  stats.openCount += 1;

  trackingEvents.unshift({
    id: `ev-open-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    campaignId,
    recipientId,
    email,
    type: 'open',
    timestamp: new Date().toISOString(),
    detail: 'Đã tải 1x1 Tracking Pixel GIF (Mở email thực tế)',
  });

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.status(200).send(TRANSPARENT_1X1_GIF);
};

app.get('/api/track/open', handleTrackOpen);
app.get('/api/track/open.gif', handleTrackOpen);

// ============================================================================
// 5. GET /api/track/click - Real Click Tracking & Validated 302 Redirect
// ============================================================================
const handleTrackClick = (req: express.Request, res: express.Response) => {
  const campaignId = (req.query.cid as string) || DEFAULT_CAMPAIGN_ID;
  const recipientId = (req.query.rid as string) || 'rec-live';
  const email = (req.query.email as string) || 'khachhang@congty.vn';
  const rawTargetUrl = String(req.query.url || '').trim();
  const mode = req.query.json as string;

  // Validate targetUrl starts with http:// or https:// to prevent Open Redirect / XSS
  const isValidRedirectTarget = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(rawTargetUrl);
  const safeTargetUrl = isValidRedirectTarget ? rawTargetUrl : 'https://b2cmail.vn';

  const stats = getOrCreateStats(campaignId);
  stats.clickCount += 1;

  trackingEvents.unshift({
    id: `ev-click-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    campaignId,
    recipientId,
    email,
    type: 'click',
    timestamp: new Date().toISOString(),
    detail: `Click CTA chuyển hướng tới: ${safeTargetUrl}`,
  });

  if (mode === '1') {
    return res.json({
      ok: true,
      redirectUrl: safeTargetUrl,
      isSafeRedirect: isValidRedirectTarget,
      stats: buildAnalyticsSnapshot(campaignId),
    });
  }

  if (!isValidRedirectTarget) {
    return res.status(400).send('Đường dẫn chuyển hướng không hợp lệ (Chỉ chấp nhận http:// hoặc https://).');
  }

  return res.redirect(302, safeTargetUrl);
};

app.get('/api/track/click', handleTrackClick);
app.get('/api/track/click/:campaignId/:recipientId', handleTrackClick);

// ============================================================================
// 6. GET & POST /api/unsubscribe - One-Click Unsubscribe & XSS-Safe Suppression
// ============================================================================
app.all('/api/unsubscribe', (req, res) => {
  const rawEmail =
    (req.query.email as string) || (req.body && req.body.email) || 'optout@congty.vn';
  const rawCampaignId =
    (req.query.cid as string) || (req.body && req.body.campaignId) || DEFAULT_CAMPAIGN_ID;
  const wantJson = req.query.json === '1' || req.method === 'POST';

  const cleanEmail = String(rawEmail).trim().toLowerCase();
  const cleanCampaignId = String(rawCampaignId).trim() || DEFAULT_CAMPAIGN_ID;

  const stats = getOrCreateStats(cleanCampaignId);
  if (cleanEmail) {
    suppressionList.add(cleanEmail);
    stats.unsubscribedCount += 1;

    trackingEvents.unshift({
      id: `ev-unsub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      campaignId: cleanCampaignId,
      email: cleanEmail,
      type: 'unsubscribe',
      timestamp: new Date().toISOString(),
      detail: 'Khách hàng bấm Hủy đăng ký — Đã đưa vào Danh sách chặn (Suppression List)',
    });
  }

  if (wantJson) {
    return res.json({
      ok: true,
      unsubscribedEmail: cleanEmail,
      campaignId: cleanCampaignId,
      stats: buildAnalyticsSnapshot(cleanCampaignId),
    });
  }

  const safeEmailHtml = escapeHtml(cleanEmail);
  const safeCampaignIdHtml = escapeHtml(cleanCampaignId);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hủy đăng ký thành công - B2Cmail Compliance</title>
</head>
<body style="font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; max-width: 440px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="width: 44px; height: 44px; border-radius: 9999px; background: #dcfce7; color: #166534; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; margin-bottom: 12px;">✓</div>
    <h1 style="font-size: 18px; margin: 0 0 8px 0;">Đã hủy đăng ký nhận bản tin</h1>
    <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 12px 0;">
      Địa chỉ <strong>${safeEmailHtml}</strong> (Chiến dịch: <code>${safeCampaignIdHtml}</code>) đã được thêm vào Danh sách chặn (Suppression List) của hệ thống B2Cmail. Bạn sẽ không còn nhận email quảng cáo từ chiến dịch này nữa.
    </p>
  </div>
</body>
</html>`);
});

// ============================================================================
// 7. GET /api/campaign/analytics - Real-time Tracking Snapshot
// ============================================================================
app.get('/api/campaign/analytics', (req, res) => {
  const campaignId = (req.query.cid as string) || DEFAULT_CAMPAIGN_ID;
  res.json(buildAnalyticsSnapshot(campaignId));
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
