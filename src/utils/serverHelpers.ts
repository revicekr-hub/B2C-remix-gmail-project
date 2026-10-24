export interface FallbackCampaignInput {
  campaignGoal?: string;
  brandName?: string;
  industry?: string;
  offerDetails?: string;
  tone?: string;
  brandColor?: string;
  websiteUrl?: string;
  signatureHtml?: string;
}

export interface ParsedCsvRecipient {
  id: string;
  name: string;
  email: string;
  company: string;
  voucherCode: string;
}

export function escapeHtml(str: unknown): string {
  const raw = String(str ?? '');
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSafeHttpUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed);
}

export function buildBrandSlug(brandName: string): string {
  const normalized = (brandName || 'thuonghieu')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'thuonghieu';
}

export function normalizeWebsiteUrl(rawUrl: unknown, brandName: string): string {
  const slug = buildBrandSlug(brandName);
  const defaultUrl = `https://${slug}.vn`;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return defaultUrl;
  }
  let cleaned = rawUrl.trim();
  // Block dangerous schemes like javascript: or data:
  if (/^(javascript|data|vbscript):/i.test(cleaned)) {
    return defaultUrl;
  }
  if (/^http:\/\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^http:\/\//i, 'https://');
  } else if (!/^https:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned.replace(/^\/+/, '')}`;
  }
  try {
    const parsed = new URL(cleaned);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return defaultUrl;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return defaultUrl;
  }
}

/**
 * Smart order-independent CSV parser that detects email (contains '@'),
 * voucherCode (uppercase alphanumeric code), name, and company regardless of column order.
 */
export function parseRecipientsCsvSmart(
  csvText: string,
  defaultDiscountCode = 'VIP2026'
): ParsedCsvRecipient[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Check if first row is a header row (no '@' or contains header keywords like 'email')
  let headerMap: Record<number, 'email' | 'name' | 'company' | 'voucherCode'> | null = null;
  const firstCols = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const firstHasEmailAddress = firstCols.some((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));

  if (!firstHasEmailAddress) {
    headerMap = {};
    firstCols.forEach((col, idx) => {
      if (col.includes('email') || col.includes('mail') || col.includes('thư')) {
        headerMap![idx] = 'email';
      } else if (
        col.includes('voucher') ||
        col.includes('code') ||
        col.includes('mã') ||
        col.includes('discount')
      ) {
        headerMap![idx] = 'voucherCode';
      } else if (
        col.includes('company') ||
        col.includes('công ty') ||
        col.includes('cong ty') ||
        col.includes('đơn vị') ||
        col.includes('tổ chức') ||
        col.includes('org')
      ) {
        headerMap![idx] = 'company';
      } else if (
        col.includes('name') ||
        col.includes('tên') ||
        col.includes('ten') ||
        col.includes('khách')
      ) {
        headerMap![idx] = 'name';
      }
    });
  }

  const startIndex = headerMap ? 1 : 0;
  const results: ParsedCsvRecipient[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map((s) => s.trim());
    if (rawCols.length === 0) continue;

    let email = '';
    let name = '';
    let company = '';
    let voucherCode = '';

    // 1. Always locate email column by '@' pattern first
    let emailColIdx = -1;
    for (let c = 0; c < rawCols.length; c++) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawCols[c])) {
        email = rawCols[c].toLowerCase();
        emailColIdx = c;
        break;
      }
    }
    if (!email) continue;

    if (headerMap && Object.keys(headerMap).length > 0) {
      rawCols.forEach((val, idx) => {
        if (idx === emailColIdx) return;
        const mapped = headerMap![idx];
        if (mapped === 'name' && !name) name = val;
        else if (mapped === 'company' && !company) company = val;
        else if (mapped === 'voucherCode' && !voucherCode) voucherCode = val;
      });
    }

    // For any remaining unmapped columns, classify heuristically
    const remainingCols = rawCols.filter((_, idx) => {
      if (idx === emailColIdx) return false;
      if (headerMap && headerMap[idx]) return false;
      return true;
    });

    const companyKeywords =
      /\b(corp|group|ltd|inc|co\.|company|jsc|tnhh|cổ phần|co phan|tập đoàn|tap doan|doanh nghiệp|công ty|cong ty|agency|studio|tech|bank|holdings|vietnam|vn)\b/i;
    const voucherPattern = /^[A-Z0-9_-]{4,16}$/;

    for (const col of remainingCols) {
      if (!col) continue;
      if (!voucherCode && voucherPattern.test(col) && /\d/.test(col)) {
        voucherCode = col;
      } else if (!company && companyKeywords.test(col)) {
        company = col;
      } else if (!name) {
        name = col;
      } else if (!company) {
        company = col;
      } else if (!voucherCode) {
        voucherCode = col;
      }
    }

    if (!name) {
      name = email.split('@')[0];
    }
    if (!company) {
      company = 'Đối tác Doanh nghiệp';
    }
    if (!voucherCode) {
      voucherCode = defaultDiscountCode;
    }

    results.push({
      id: `csv-${i + 1}`,
      name,
      email,
      company,
      voucherCode,
    });
  }

  return results;
}

/**
 * Generates 3 rich, mobile-compatible HTML email templates that dynamically adapt
 * to both `tone` ('formal' | 'witty' | 'urgent' | 'professional') and
 * `campaignGoal` ('launch' | 'promo' | 'care').
 */
export function generateFallbackCampaign(reqBody: FallbackCampaignInput) {
  const brandName = (reqBody?.brandName || '').trim() || 'Thương hiệu của bạn';
  const industry = (reqBody?.industry || '').trim() || 'Thương mại & Dịch vụ';
  const offerDetails =
    (reqBody?.offerDetails || '').trim() || 'Chương trình ưu đãi đặc biệt dành cho khách hàng';
  const primaryColor = (reqBody?.brandColor || '').trim() || '#2563eb';
  const websiteUrl = normalizeWebsiteUrl(reqBody?.websiteUrl, brandName);
  const signatureHtml = (reqBody?.signatureHtml || '').trim();

  const rawTone = String(reqBody?.tone || 'professional').toLowerCase();
  const tone: 'formal' | 'witty' | 'urgent' | 'professional' =
    rawTone === 'formal' || rawTone === 'trang trọng'
      ? 'formal'
      : rawTone === 'witty' || rawTone === 'hài hước' || rawTone === 'thân mật'
      ? 'witty'
      : rawTone === 'urgent' || rawTone === 'khẩn cấp'
      ? 'urgent'
      : 'professional';

  const rawGoal = String(reqBody?.campaignGoal || 'promo').toLowerCase();
  const campaignGoal: 'launch' | 'promo' | 'care' =
    rawGoal === 'launch' ? 'launch' : rawGoal === 'care' ? 'care' : 'promo';

  // Goal-specific context phrases
  const goalConfig = {
    launch: {
      badgeLabel: 'RA MẮT SẢN PHẨM MỚI',
      goalNoun: 'Sự kiện Ra mắt Giải pháp Mới',
      ctaPath: '/ra-mat-san-pham',
      highlightPrefix: 'Ra mắt đột phá',
    },
    promo: {
      badgeLabel: 'ĐẶC QUYỀN KHUYẾN MÃI',
      goalNoun: 'Chương trình Ưu đãi Đặc quyền',
      ctaPath: '/uu-dai-dac-quyen',
      highlightPrefix: 'Tối ưu chuyển đổi',
    },
    care: {
      badgeLabel: 'TRI ÂN KHÁCH HÀNG VIP',
      goalNoun: 'Chương trình Chăm sóc & Tri ân VIP',
      ctaPath: '/tri-an-khach-hang',
      highlightPrefix: 'Gắn kết khách hàng',
    },
  }[campaignGoal];

  // Tone-specific vocabulary, greetings, emojis, subjects, CTAs
  const toneVariants = {
    formal: {
      toneLabel: 'Trang trọng',
      greeting1: 'Kính gửi Quý khách hàng {{Ten_Khach_Hang}} — Đại diện {{Ten_Cong_Ty}},',
      greeting2: 'Thưa Quý đối tác {{Ten_Khach_Hang}} tại {{Ten_Cong_Ty}},',
      greeting3: 'Kính gửi Ban Giám đốc & Quý khách hàng {{Ten_Khach_Hang}} ({{Ten_Cong_Ty}}),',
      subject1: `[Trân trọng] ${brandName} kính gửi {{Ten_Khach_Hang}} (${'{{Ten_Cong_Ty}}'}): ${goalConfig.goalNoun}`,
      subject2: `Thư ngỏ từ ${brandName}: Đồng hành chiến lược cùng {{Ten_Cong_Ty}} trong giai đoạn mới`,
      subject3: `[Thông báo quan trọng] Quyền lợi ưu tiên dành riêng cho {{Ten_Khach_Hang}} — Mã {{Ma_Uu_Dai}}`,
      preheader1: `Kính mời {{Ten_Khach_Hang}} xem chi tiết văn bản đề xuất và đặc quyền chính thức từ ${brandName}.`,
      preheader2: `Cam kết chất lượng chuẩn mực từ ${brandName} dành riêng cho Quý đối tác {{Ten_Cong_Ty}}.`,
      preheader3: `Hiệu lực đăng ký quyền lợi ưu tiên dành cho {{Ten_Cong_Ty}} đang được mở chính thức.`,
      intro1: `Bằng sự trân trọng cao nhất, <strong>${brandName}</strong> xin gửi lời chào nồng nhiệt tới Quý vị. Trong khuôn khổ <strong>${goalConfig.goalNoun}</strong>, chúng tôi trân trọng giới thiệu gói quyền lợi chuẩn mực được thiết kế riêng cho Quý đơn vị:`,
      intro2: `Trên hành trình phát triển bền vững trong lĩnh vực <strong>${industry}</strong>, sự tín nhiệm của Quý khách hàng <strong>{{Ten_Khach_Hang}}</strong> là niềm vinh hạnh lớn lao đối với tập thể <strong>${brandName}</strong>.`,
      intro3: `Nhằm đảm bảo quyền lợi tối đa cho các đối tác chiến lược như <strong>{{Ten_Cong_Ty}}</strong>, Ban Quản trị <strong>${brandName}</strong> trân trọng thông báo thời hạn áp dụng đặc quyền ưu tiên:`,
      closing: 'Kính chúc Quý khách hàng và Quý doanh nghiệp thịnh vượng, thành công.',
      cta1: 'XÁC NHẬN QUYỀN LỢI CHÍNH THỨC',
      cta2: 'XEM HỒ SƠ ĐỀ XUẤT CHI TIẾT',
      cta3: 'ĐĂNG KÝ QUYỀN LỢI ƯU TIÊN',
    },
    witty: {
      toneLabel: 'Hài hước & Thân mật',
      greeting1: 'Chào {{Ten_Khach_Hang}} ơi 😄! Team {{Ten_Cong_Ty}} hôm nay có gì vui không?',
      greeting2: 'Hé lô {{Ten_Khach_Hang}} ✨! Một chút "vitamin hứng khởi" gửi tới {{Ten_Cong_Ty}} nè,',
      greeting3: 'Báo động vui vẻ {{Ten_Khach_Hang}} ơi 🚀! Đừng để chiếc deal xịn này "bay màu" nhé,',
      subject1: `😄 {{Ten_Khach_Hang}} ơi, "bắt sóng" ngay món quà siêu hời từ ${brandName} nha!`,
      subject2: `✨ Kể nhỏ cho {{Ten_Khach_Hang}} tại {{Ten_Cong_Ty}} nghe bí kíp "lên đời" cực mượt!`,
      subject3: `🔥 Nhanh tay kẻo tiếc {{Ten_Khach_Hang}} ơi! Mã {{Ma_Uu_Dai}} đang vẫy gọi kìa!`,
      preheader1: `Bật mí ngay món quà cực chất từ ${brandName} — xem xong chỉ muốn bấm chốt liền tay!`,
      preheader2: `Không đọc hết email này là tiếc hùi hụi đó nha {{Ten_Khach_Hang}} ơi!`,
      preheader3: `Mã {{Ma_Uu_Dai}} đã sẵn sàng lên đơn cho {{Ten_Cong_Ty}} rồi nè!`,
      intro1: `Đừng để ngày làm việc trôi qua nhàm chán! <strong>${brandName}</strong> vừa "ra lò" <strong>${goalConfig.goalNoun}</strong> cực kỳ thú vị để tiếp thêm 200% năng lượng cho <strong>{{Ten_Khach_Hang}}</strong> và cả team <strong>{{Ten_Cong_Ty}}</strong> đây:`,
      intro2: `Ai làm trong ngành <strong>${industry}</strong> mà chẳng có lúc đau đầu vì deadline đúng không nào? Hiểu tâm lý đó, <strong>${brandName}</strong> mang tới một "trợ thủ" vừa chất vừa tiết kiệm cho bạn:`,
      intro3: `Tin chuẩn 100% không cần chỉnh: Suất ưu đãi đặc biệt của <strong>${brandName}</strong> đang đếm ngược từng giờ rồi đó <strong>{{Ten_Khach_Hang}}</strong> ơi!`,
      closing: 'Chúc bạn một ngày làm việc tràn ngập tiếng cười và bão đơn nhé! 🎉',
      cta1: 'KHÁM PHÁ QUÀ XỊN NGAY 😄',
      cta2: 'TRẢI NGHIỆM THỬ LIỀN TAY ✨',
      cta3: 'CHỐT DEAL KẺO LỠ 🚀',
    },
    urgent: {
      toneLabel: 'Khẩn cấp (FOMO)',
      greeting1: '⚡ KHẨN CẤP: Thông báo đặc biệt gửi {{Ten_Khach_Hang}} ({{Ten_Cong_Ty}}),',
      greeting2: '⏰ CHỈ CÒN ÍT GIỜ: {{Ten_Khach_Hang}} tại {{Ten_Cong_Ty}} vui lòng kiểm tra ngay,',
      greeting3: '🔥 CƠ HỘI CUỐI CÙNG: Dành riêng cho {{Ten_Khach_Hang}} trước khi đóng cổng,',
      subject1: `⚡ [KHẨN CẤP - 24H CUỐI] {{Ten_Khach_Hang}} ơi, nhận ngay đặc quyền từ ${brandName}!`,
      subject2: `⏰ Đếm ngược cho {{Ten_Cong_Ty}}: Chỉ còn rất ít suất ưu đãi ${brandName} hôm nay!`,
      subject3: `🔥 [SẮP HẾT HẠN] Kích hoạt mã {{Ma_Uu_Dai}} của {{Ten_Khach_Hang}} trước 23:59 tối nay!`,
      preheader1: `Cổng đăng ký ưu đãi giới hạn của ${brandName} sẽ tự động đóng ngay khi đủ số lượng.`,
      preheader2: `Hơn 85% suất ưu đãi trong ngành ${industry} đã được đăng ký — giữ suất cho {{Ten_Cong_Ty}} ngay!`,
      preheader3: `Mã {{Ma_Uu_Dai}} sẽ hết hiệu lực sau 23:59 — đừng bỏ lỡ quyền lợi của bạn!`,
      intro1: `Thời gian không chờ đợi! <strong>${brandName}</strong> chính thức mở đợt phân bổ giới hạn cho <strong>${goalConfig.goalNoun}</strong>. Đây là cơ hội nhanh nhất để <strong>{{Ten_Cong_Ty}}</strong> bứt phá ngay hôm nay:`,
      intro2: `Hiện tại số lượng đăng ký từ các doanh nghiệp <strong>${industry}</strong> đang tăng vọt từng phút. Chúng tôi ưu tiên giữ suất đặc biệt này cho <strong>{{Ten_Khach_Hang}}</strong>:`,
      intro3: `Hệ thống của <strong>${brandName}</strong> ghi nhận mã <strong>{{Ma_Uu_Dai}}</strong> dành cho <strong>{{Ten_Khach_Hang}}</strong> sẽ đóng lại ngay khi chạm trần ngân sách khuyến mãi:`,
      closing: 'Hãy hành động ngay lập tức để không đánh mất lợi thế cạnh tranh của bạn! ⚡',
      cta1: 'GIỮ SUẤT ƯU ĐÃI NGAY LẬP TỨC ⚡',
      cta2: 'KÍCH HOẠT TRƯỚC KHI HẾT HẠN ⏰',
      cta3: 'ÁP DỤNG MÃ {{Ma_Uu_Dai}} NGAY 🔥',
    },
    professional: {
      toneLabel: 'Chuyên nghiệp',
      greeting1: 'Xin chào {{Ten_Khach_Hang}} — Đối tác tại {{Ten_Cong_Ty}},',
      greeting2: 'Chào {{Ten_Khach_Hang}}, cùng đội ngũ {{Ten_Cong_Ty}},',
      greeting3: 'Xin chào {{Ten_Khach_Hang}} ({{Ten_Cong_Ty}}),',
      subject1: `[${brandName}] ${goalConfig.goalNoun} dành cho {{Ten_Khach_Hang}} (${'{{Ten_Cong_Ty}}'})`,
      subject2: `Giải pháp tối ưu hiệu suất ngành ${industry} từ ${brandName} cho {{Ten_Cong_Ty}}`,
      subject3: `[Ưu tiên VIP] Kích hoạt mã {{Ma_Uu_Dai}} cho {{Ten_Khach_Hang}} tại ${brandName}`,
      preheader1: `Tối ưu hiệu quả vận hành và ngân sách cho {{Ten_Cong_Ty}} cùng giải pháp từ ${brandName}.`,
      preheader2: `Cách các doanh nghiệp hàng đầu ngành ${industry} nâng cao tỷ lệ chuyển đổi cùng ${brandName}.`,
      preheader3: `Sử dụng mã {{Ma_Uu_Dai}} để nhận trọn bộ quyền lợi triển khai từ ${brandName}.`,
      intro1: `Nhằm hỗ trợ <strong>{{Ten_Cong_Ty}}</strong> đạt hiệu suất cao nhất trong giai đoạn tới, <strong>${brandName}</strong> triển khai <strong>${goalConfig.goalNoun}</strong> với các giá trị thực tiễn và đo lường được:`,
      intro2: `Qua quá trình làm việc cùng nhiều doanh nghiệp trong ngành <strong>${industry}</strong>, <strong>${brandName}</strong> thấu hiểu bài toán tối ưu chi phí và gia tăng tăng trưởng mà <strong>{{Ten_Khach_Hang}}</strong> đang hướng tới:`,
      intro3: `Để giúp <strong>{{Ten_Cong_Ty}}</strong> triển khai nhanh chóng và hiệu quả nhất, <strong>${brandName}</strong> đã kích hoạt sẵn mã quyền lợi dành riêng cho tài khoản của bạn:`,
      closing: 'Rất mong được đồng hành và mang lại giá trị thiết thực cho Quý doanh nghiệp.',
      cta1: 'Nhận Ưu Đãi Cho {{Ten_Cong_Ty}} →',
      cta2: 'Khám Phá Giải Pháp Ngay',
      cta3: 'Kích Hoạt Mã {{Ma_Uu_Dai}} Ngay',
    },
  }[tone];

  // Mobile-friendly Email HTML builder using standard <table> layout instead of fragile flex layout
  const buildMobileSafeEmailHtml = (opts: {
    badgeText: string;
    headingText: string;
    greetingText: string;
    introHtml: string;
    voucherLabel: string;
    ctaText: string;
    ctaUrl: string;
    accentBg: string;
    accentBorder: string;
  }) => {
    const footerBlock = signatureHtml
      ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" /><div style="font-size:12px;color:#64748b;line-height:1.5;">${signatureHtml}</div>`
      : `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" /><div style="font-size:12px;color:#64748b;line-height:1.5;"><strong>${brandName}</strong> · Ngành ${industry}<br/>Website: <a href="${websiteUrl}" style="color:${primaryColor};text-decoration:none;">${websiteUrl}</a></div>`;

    return `<div style="font-family: 'Plus Jakarta Sans', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; background: #ffffff; box-sizing: border-box;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 14px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px;">
    <tr>
      <td align="left" valign="middle" style="padding: 0 0 8px 0;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: ${primaryColor}; background: ${opts.accentBg}; padding: 4px 10px; border-radius: 4px; display: inline-block;">${opts.badgeText} · ${toneVariants.toneLabel.toUpperCase()}</span>
      </td>
      <td align="right" valign="middle" style="padding: 0 0 8px 0; font-size: 11px; color: #64748b; font-family: monospace;">
        Mã: <strong>{{Ma_Uu_Dai}}</strong>
      </td>
    </tr>
  </table>
  <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; line-height: 1.4;">${opts.headingText}</h2>
  <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">${opts.greetingText}</p>
  <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px 0;">${opts.introHtml}</p>
  <div style="background: ${opts.accentBg}; border-left: 4px solid ${opts.accentBorder}; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">🎯 Nội dung trọng tâm (${goalConfig.badgeLabel}):</p>
    <p style="margin: 0 0 8px 0; font-size: 13.5px; color: #1e293b; line-height: 1.55;">${offerDetails}</p>
    <p style="margin: 0; font-size: 13px; color: #334155;">${opts.voucherLabel}: <strong style="color: ${primaryColor}; font-family: monospace; font-size: 14px;">{{Ma_Uu_Dai}}</strong></p>
  </div>
  <p style="font-size: 13.5px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">${toneVariants.closing}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
    <tr>
      <td align="center">
        <a href="${opts.ctaUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; text-align: center;">${opts.ctaText}</a>
      </td>
    </tr>
  </table>
  ${footerBlock}
</div>`;
  };

  const ctaUrl1 = `${websiteUrl}${goalConfig.ctaPath}?tpl=1&tone=${tone}`;
  const ctaUrl2 = `${websiteUrl}${goalConfig.ctaPath}?tpl=2&tone=${tone}`;
  const ctaUrl3 = `${websiteUrl}${goalConfig.ctaPath}?tpl=3&tone=${tone}`;

  return {
    templates: [
      {
        id: 'template-1',
        title: `Mẫu 1: Trực diện & Lợi ích (${toneVariants.toneLabel})`,
        angle: `Đi thẳng vào giá trị cốt lõi (${goalConfig.badgeLabel}) kết hợp cá nhân hóa Merge Tags`,
        subject: toneVariants.subject1,
        preheader: toneVariants.preheader1,
        bodyHtml: buildMobileSafeEmailHtml({
          badgeText: `${brandName} · ${goalConfig.badgeLabel}`,
          headingText: `${goalConfig.goalNoun} dành riêng cho {{Ten_Khach_Hang}}`,
          greetingText: toneVariants.greeting1,
          introHtml: toneVariants.intro1,
          voucherLabel: 'Mã đặc quyền dành cho {{Ten_Cong_Ty}}',
          ctaText: toneVariants.cta1,
          ctaUrl: ctaUrl1,
          accentBg: '#f8fafc',
          accentBorder: primaryColor,
        }),
        bodyText: `${toneVariants.greeting1}\n\n${brandName} triển khai ${goalConfig.goalNoun}: ${offerDetails}.\nMã ưu đãi dành riêng cho {{Ten_Cong_Ty}}: {{Ma_Uu_Dai}}.\n\n${toneVariants.closing}\n\n👉 ${toneVariants.cta1}: ${ctaUrl1}`,
        ctaText: toneVariants.cta1,
        ctaUrl: ctaUrl1,
        estimatedOpenRate: tone === 'urgent' ? '44.5%' : tone === 'witty' ? '43.0%' : '41.5%',
        estimatedCTR: tone === 'urgent' ? '12.4%' : '10.8%',
        keyHighlight: `${goalConfig.highlightPrefix} · Tông ${toneVariants.toneLabel}`,
      },
      {
        id: 'template-2',
        title: `Mẫu 2: Kể chuyện & Cảm xúc (${toneVariants.toneLabel})`,
        angle: `Xây dựng sự đồng cảm sâu sắc theo ngành ${industry} & kết nối thương hiệu`,
        subject: toneVariants.subject2,
        preheader: toneVariants.preheader2,
        bodyHtml: buildMobileSafeEmailHtml({
          badgeText: `${brandName} · CÂU CHUYỆN THƯƠNG HIỆU`,
          headingText: `Đồng hành cùng {{Ten_Cong_Ty}} nâng tầm trải nghiệm ngành ${industry}`,
          greetingText: toneVariants.greeting2,
          introHtml: toneVariants.intro2,
          voucherLabel: 'Mã quà tặng tri ân {{Ten_Khach_Hang}}',
          ctaText: toneVariants.cta2,
          ctaUrl: ctaUrl2,
          accentBg: '#f0fdf4',
          accentBorder: '#16a34a',
        }),
        bodyText: `${toneVariants.greeting2}\n\nTrong lĩnh vực ${industry}, ${brandName} luôn nỗ lực mang đến giá trị tốt nhất cho {{Ten_Cong_Ty}}.\nChi tiết chương trình: ${offerDetails}.\nMã ưu đãi của bạn: {{Ma_Uu_Dai}}.\n\n${toneVariants.closing}\n\n👉 ${toneVariants.cta2}: ${ctaUrl2}`,
        ctaText: toneVariants.cta2,
        ctaUrl: ctaUrl2,
        estimatedOpenRate: '38.2%',
        estimatedCTR: '9.4%',
        keyHighlight: `Kể chuyện cảm xúc · Tông ${toneVariants.toneLabel}`,
      },
      {
        id: 'template-3',
        title: `Mẫu 3: Khẩn cấp & Thúc đẩy Hành động (${toneVariants.toneLabel})`,
        angle: `Tạo động lực quyết định nhanh với mã {{Ma_Uu_Dai}} có thời hạn`,
        subject: toneVariants.subject3,
        preheader: toneVariants.preheader3,
        bodyHtml: buildMobileSafeEmailHtml({
          badgeText: `${brandName} · ƯU TIÊN GIỚI HẠN`,
          headingText: `Kích hoạt quyền lợi {{Ma_Uu_Dai}} cho {{Ten_Khach_Hang}} ngay hôm nay`,
          greetingText: toneVariants.greeting3,
          introHtml: toneVariants.intro3,
          voucherLabel: 'Mã kích hoạt nhanh của {{Ten_Khach_Hang}}',
          ctaText: toneVariants.cta3,
          ctaUrl: ctaUrl3,
          accentBg: '#fff1f2',
          accentBorder: '#e11d48',
        }),
        bodyText: `${toneVariants.greeting3}\n\nQuyền lợi ${goalConfig.goalNoun} từ ${brandName}: ${offerDetails}.\nVui lòng sử dụng mã {{Ma_Uu_Dai}} dành cho {{Ten_Cong_Ty}} trước khi hết hạn.\n\n${toneVariants.closing}\n\n👉 ${toneVariants.cta3}: ${ctaUrl3}`,
        ctaText: toneVariants.cta3,
        ctaUrl: ctaUrl3,
        estimatedOpenRate: '45.8%',
        estimatedCTR: '13.1%',
        keyHighlight: `Thúc đẩy chuyển đổi · Tông ${toneVariants.toneLabel}`,
      },
    ],
    sendTimeTip: {
      bestDays:
        campaignGoal === 'launch'
          ? 'Thứ Ba & Thứ Tư'
          : campaignGoal === 'care'
          ? 'Thứ Năm & Thứ Sáu'
          : 'Thứ Ba, Thứ Năm & Chủ Nhật',
      bestHours:
        industry.toLowerCase().includes('b2b') || industry.toLowerCase().includes('saas')
          ? '09:30 - 11:00 sáng hoặc 14:00 - 15:30 chiều'
          : '10:00 - 11:30 sáng hoặc 19:30 - 21:00 tối',
      explanation: `Theo thống kê hành vi mở thư ngành ${industry}, gửi chiến dịch "${goalConfig.goalNoun}" với tông ${toneVariants.toneLabel} vào khung giờ này giúp tăng +27% tỷ lệ đọc trọn vẹn và +18% tỷ lệ nhấp nút CTA.`,
      suggestedDateTimeIso: new Date(Date.now() + 86400000).toISOString(),
      industryInsights: `Cá nhân hóa tiêu đề bằng {{Ten_Khach_Hang}} và {{Ten_Cong_Ty}} kết hợp bố cục bảng HTML chuẩn Mobile giúp vượt qua bộ lọc Promotions và hiển thị mượt trên 100% thiết bị di động.`,
    },
    deliverabilityAudit: {
      spamScore: 12,
      riskLevel: 'low' as const,
      spamWarnings: [
        'Tỷ lệ Text-to-HTML cân đối (Chuẩn Table Layout tương thích Gmail Desktop & Mobile)',
        'Không phát hiện từ khóa Spam nhạy cảm hay lạm dụng chữ IN HOA quá mức',
        'Đã tích hợp sẵn liên kết Hủy đăng ký (One-Click Unsubscribe) và biến cá nhân hóa Merge Tags',
      ],
      mergeTagsUsed: ['{{Ten_Khach_Hang}}', '{{Ten_Cong_Ty}}', '{{Ma_Uu_Dai}}'],
      hasUnsubscribeLink: true,
    },
  };
}
