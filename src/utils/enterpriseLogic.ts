import {
  ApprovalStatus,
  BrandKit,
  DeliverabilityAudit,
  EmailTemplate,
  WorkspaceRole,
} from '../types';

export const DEFAULT_BRAND_KITS: BrandKit[] = [];

export const MERGE_TAG_CATALOG: {
  tag: string;
  label: string;
  sample: string;
  description: string;
}[] = [
  {
    tag: '{{Ten_Khach_Hang}}',
    label: 'Tên khách hàng',
    sample: 'Tên khách hàng',
    description: 'Thay thế bằng họ tên người nhận trong danh bạ CRM',
  },
  {
    tag: '{{Ten_Cong_Ty}}',
    label: 'Tên công ty',
    sample: 'Tên công ty',
    description: 'Thay thế bằng tên doanh nghiệp/tổ chức của người nhận',
  },
  {
    tag: '{{Ma_Uu_Dai}}',
    label: 'Mã ưu đãi',
    sample: 'VIP-CODE',
    description: 'Thay thế bằng mã voucher cá nhân hóa hoặc mã chiến dịch',
  },
  {
    tag: '{{email}}',
    label: 'Email nhận',
    sample: 'email@domain.com',
    description: 'Địa chỉ email của khách hàng',
  },
];

export const APPROVAL_STATUS_STEPS: {
  status: ApprovalStatus;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    status: 'draft',
    stepNumber: 1,
    label: 'Bản nháp',
    shortLabel: '1. Bản nháp',
    description: 'Copywriter đang biên tập nội dung và kiểm tra biến cá nhân hóa',
  },
  {
    status: 'pending_approval',
    stepNumber: 2,
    label: 'Chờ Quản lý duyệt',
    shortLabel: '2. Chờ Quản lý duyệt',
    description: 'Đã khóa nội dung tạm thời, chờ Marketing Manager kiểm duyệt',
  },
  {
    status: 'approved',
    stepNumber: 3,
    label: 'Đã duyệt',
    shortLabel: '3. Đã duyệt',
    description: 'Nội dung & điểm Spam đạt chuẩn doanh nghiệp, sẵn sàng phát tán',
  },
  {
    status: 'scheduled',
    stepNumber: 4,
    label: 'Đã lên lịch gửi',
    shortLabel: '4. Đã lên lịch gửi',
    description: 'Đã đưa vào hàng đợi Job Queue để tự động gửi theo khung giờ vàng',
  },
];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  copywriter: 'Copywriter / Marketer',
  approver: 'Marketing Manager (Approver)',
  admin: 'Workspace Admin',
};

/**
 * Apply a selected BrandKit (primaryColor, signatureHtml, websiteUrl, brandName)
 * to all 3 email templates dynamically.
 */
export function applyBrandKitToTemplates(
  templates: EmailTemplate[],
  brandKit: BrandKit,
  previousBrandName?: string
): EmailTemplate[] {
  const cleanWebsite = (brandKit.websiteUrl || 'https://b2cmail.vn').replace(/\/+$/, '');
  const color = brandKit.primaryColor || '#2563eb';
  const signature =
    brandKit.signatureHtml ||
    `${brandKit.brandName} • Hệ thống Email Doanh nghiệp B2Cmail`;

  return templates.map((tpl, idx) => {
    const slug = idx === 0 ? 'offer' : idx === 1 ? 'story' : 'flash-vip';
    const nextCtaUrl = `${cleanWebsite}/${slug}`;

    let updatedHtml = tpl.bodyHtml;

    // 1. Replace primary hex colors in inline styles (buttons, borders, headings)
    updatedHtml = updatedHtml.replace(
      /(background(?:-color)?:\s*)(#[0-9a-fA-F]{6})(\s*;?\s*color:\s*#ffffff)/gi,
      `$1${color}$3`
    );
    updatedHtml = updatedHtml.replace(
      /(border-(?:bottom|left|top):\s*\d+px\s+solid\s+)(#[0-9a-fA-F]{6})/gi,
      `$1${color}`
    );

    // 2. Update brand signature block if marked or replace footer paragraph
    const sigMarkerRegex = /<!-- BRAND_SIGNATURE_START -->[\s\S]*?<!-- BRAND_SIGNATURE_END -->/i;
    const newSignatureBlock = `<!-- BRAND_SIGNATURE_START --><div data-brand-signature="true" style="font-size: 11px; color: #64748b; text-align: center; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
    <strong style="color: ${color};">${brandKit.brandName}</strong><br/>
    <span>${signature}</span> • <a href="${cleanWebsite}" style="color: ${color}; text-decoration: underline;">Website</a> • <a href="#unsubscribe" style="color: #94a3b8; text-decoration: underline;">Hủy nhận thư</a>
  </div><!-- BRAND_SIGNATURE_END -->`;

    if (sigMarkerRegex.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(sigMarkerRegex, newSignatureBlock);
    } else if (updatedHtml.includes('Hủy nhận thư') || updatedHtml.includes('hủy đăng ký')) {
      // Replace the last footer <p ...> containing unsubscribe with our structured signature block
      updatedHtml = updatedHtml.replace(
        /<p[^>]*>(?:(?!<p)[\s\S])*?(?:Hủy nhận thư|hủy đăng ký)[\s\S]*?<\/p>/i,
        newSignatureBlock
      );
    } else {
      // Append before closing </div>
      const lastDivIdx = updatedHtml.lastIndexOf('</div>');
      if (lastDivIdx !== -1) {
        updatedHtml =
          updatedHtml.slice(0, lastDivIdx) +
          '\n  ' +
          newSignatureBlock +
          '\n' +
          updatedHtml.slice(lastDivIdx);
      } else {
        updatedHtml += `\n${newSignatureBlock}`;
      }
    }

    // 3. Replace old CTA URLs in href attributes
    if (tpl.ctaUrl) {
      updatedHtml = updatedHtml.split(tpl.ctaUrl).join(nextCtaUrl);
    }

    // 4. Replace previous brand name in subject/html/text if applicable
    let updatedSubject = tpl.subject;
    let updatedText = tpl.bodyText;
    const knownBrands = [previousBrandName].filter((b): b is string =>
      Boolean(b && b.trim())
    );

    for (const oldBrand of knownBrands) {
      if (oldBrand !== brandKit.brandName) {
        updatedSubject = updatedSubject.split(oldBrand).join(brandKit.brandName);
        updatedHtml = updatedHtml.split(oldBrand).join(brandKit.brandName);
        updatedText = updatedText.split(oldBrand).join(brandKit.brandName);
      }
    }

    if (brandKit.discountCode) {
      updatedHtml = updatedHtml.replace(/AUTUMN40/g, brandKit.discountCode);
      updatedText = updatedText.replace(/AUTUMN40/g, brandKit.discountCode);
      updatedSubject = updatedSubject.replace(/AUTUMN40/g, brandKit.discountCode);
    }

    return {
      ...tpl,
      subject: updatedSubject,
      bodyHtml: updatedHtml,
      bodyText: `${updatedText.split('\n--')[0]}\n--\n${signature}\nWebsite: ${cleanWebsite}`,
      ctaUrl: nextCtaUrl,
    };
  });
}

/**
 * Extract all unique Merge Tags (e.g. {{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}, {{Ma_Uu_Dai}})
 * from strings or templates.
 */
export function extractMergeTags(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g) || [];
  const normalized = matches.map((m) => m.replace(/\s+/g, ''));
  return Array.from(new Set(normalized));
}

/**
 * Evaluate Spam Score (0-100, lower is safer), Spam Warnings, and Merge Tags Used
 */
export function evaluateDeliverabilityAudit(
  templates: EmailTemplate[],
  customSubject?: string,
  customHtml?: string
): DeliverabilityAudit {
  const combinedSubjects = [
    customSubject || '',
    ...templates.map((t) => t.subject),
  ].join(' ');
  const combinedHtml = [
    customHtml || '',
    ...templates.map((t) => `${t.bodyHtml} ${t.bodyText}`),
  ].join(' ');

  let score = 14; // Base enterprise clean score
  const warnings: string[] = [];

  // 1. Check excessive exclamation marks
  if (/!{2,}/.test(combinedSubjects) || (combinedHtml.match(/!/g) || []).length > 8) {
    score += 18;
    warnings.push(
      'Sử dụng nhiều dấu chấm than (!!) trong tiêu đề/nội dung dễ kích hoạt bộ lọc Gmail Promotions.'
    );
  }

  // 2. Check ALL CAPS words in subject
  const upperWords = (customSubject || templates[0]?.subject || '')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && w === w.toUpperCase() && /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(w));
  if (upperWords.length >= 2) {
    score += 15;
    warnings.push(
      'Tiêu đề chứa nhiều từ viết IN HOA liên tiếp có nguy cơ bị đánh dấu Spam cao.'
    );
  }

  // 3. Check high-risk promotional / spam trigger words
  const spamKeywords = [
    { regex: /miễn phí 100%|100% free/i, label: '"Miễn phí 100%"' },
    { regex: /kiếm tiền nhanh|làm giàu/i, label: '"Kiếm tiền nhanh"' },
    { regex: /trúng thưởng|nhận tiền mặt/i, label: '"Trúng thưởng / Nhận tiền mặt"' },
    { regex: /khẩn cấp|chỉ 24h|cuối cùng/i, label: 'Từ ngữ thúc ép FOMO ("Chỉ 24H", "Cơ hội cuối")' },
    { regex: /giảm\s*\d{2,3}%/i, label: 'Tỷ lệ chiết khấu cao trong Subject (dễ vào tab Khuyến mãi)' },
  ];

  for (const kw of spamKeywords) {
    if (kw.regex.test(combinedSubjects) || kw.regex.test(combinedHtml)) {
      score += 7;
      warnings.push(`Phát hiện cụm từ nhạy cảm ${kw.label} có thể phân loại vào tab Quảng cáo (Promotions).`);
    }
  }

  // 4. Check Unsubscribe link presence
  const hasUnsubscribe = /unsubscribe|hủy đăng ký|hủy nhận thư/i.test(combinedHtml);
  if (!hasUnsubscribe) {
    score += 22;
    warnings.push(
      'Thiếu liên kết Hủy đăng ký (Unsubscribe) bắt buộc theo chuẩn gửi thư doanh nghiệp CAN-SPAM / GDPR.'
    );
  }

  // 5. Extract merge tags
  const extractedTags = extractMergeTags(`${combinedSubjects} ${combinedHtml}`);
  const mergeTagsUsed =
    extractedTags.length > 0
      ? extractedTags
      : ['{{Ten_Khach_Hang}}', '{{Ten_Cong_Ty}}', '{{Ma_Uu_Dai}}'];

  if (extractedTags.length === 0) {
    score += 8;
    warnings.push(
      'Chưa chèn biến cá nhân hóa động ({{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}) — nên cá nhân hóa để tăng độ tin cậy.'
    );
  }

  if (warnings.length === 0) {
    warnings.push(
      'Cấu trúc HTML/Text cân bằng tốt, không phát hiện từ khóa cấm của bộ lọc Gmail Postmaster.'
    );
  }

  const clampedScore = Math.max(5, Math.min(95, score));

  return {
    spamScore: clampedScore,
    spamWarnings: warnings.slice(0, 4),
    mergeTagsUsed,
  };
}

/**
 * Transition approval workflow state
 */
export function getNextApprovalStatus(
  current: ApprovalStatus,
  action: 'submit_review' | 'approve' | 'reject' | 'schedule'
): ApprovalStatus {
  switch (action) {
    case 'submit_review':
      return 'pending_approval';
    case 'approve':
      return 'approved';
    case 'reject':
      return 'draft';
    case 'schedule':
      return 'scheduled';
    default:
      return current;
  }
}

/**
 * Inject Open Tracking 1x1 Pixel, Click Tracking Redirect, and Enterprise Unsubscribe footer into HTML body
 */
export function injectTrackingAndUnsubscribe(
  bodyHtml: string,
  appUrl: string,
  campaignId: string,
  recipientId: string,
  recipientEmail: string,
  targetCtaUrl?: string
): {
  trackedHtml: string;
  trackingPixelUrl: string;
  clickTrackUrl: string;
  unsubscribeUrl: string;
} {
  const cleanAppUrl = (appUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const encodedCid = encodeURIComponent(campaignId);
  const encodedRid = encodeURIComponent(recipientId);
  const encodedEmail = encodeURIComponent(recipientEmail);
  const finalTargetUrl = targetCtaUrl || '#';

  const trackingPixelUrl = `${cleanAppUrl}/api/track/open?cid=${encodedCid}&rid=${encodedRid}&email=${encodedEmail}`;
  const clickTrackUrl = `${cleanAppUrl}/api/track/click?cid=${encodedCid}&rid=${encodedRid}&email=${encodedEmail}&url=${encodeURIComponent(
    finalTargetUrl
  )}`;
  const unsubscribeUrl = `${cleanAppUrl}/api/unsubscribe?cid=${encodedCid}&email=${encodedEmail}`;

  let trackedHtml = bodyHtml || '';

  // Replace CTA URL with click tracking redirect if present
  if (targetCtaUrl && trackedHtml.includes(targetCtaUrl)) {
    trackedHtml = trackedHtml.split(targetCtaUrl).join(clickTrackUrl);
  }

  // Replace #unsubscribe or href="#" on unsubscribe links
  trackedHtml = trackedHtml.replace(/href="#unsubscribe"/gi, `href="${unsubscribeUrl}"`);
  trackedHtml = trackedHtml.replace(
    /<a\s+href="#"([^>]*>[\s\S]*?(?:Hủy nhận thư|hủy đăng ký)[\s\S]*?<\/a>)/gi,
    `<a href="${unsubscribeUrl}"$1`
  );

  // Append compliance unsubscribe footer if none exists
  if (!/api\/unsubscribe/i.test(trackedHtml)) {
    trackedHtml += `\n<div style="margin-top:12px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8;text-align:center;">Email được gửi từ hệ thống B2Cmail Enterprise • <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Hủy đăng ký nhận thư (Unsubscribe)</a></div>`;
  }

  // Append 1x1 tracking pixel GIF
  const pixelImgTag = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`;
  trackedHtml += `\n${pixelImgTag}`;

  return {
    trackedHtml,
    trackingPixelUrl,
    clickTrackUrl,
    unsubscribeUrl,
  };
}

/**
 * Simulated DNS SPF / DKIM / DMARC checker for enterprise sender domains
 */
export function checkDomainDnsAuth(domainInput: string) {
  const cleanDomain =
    (domainInput || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0] || '';

  return {
    domain: cleanDomain,
    spfValid: Boolean(cleanDomain),
    dkimValid: Boolean(cleanDomain),
    dmarcValid: Boolean(cleanDomain),
    score: cleanDomain ? 98 : 0,
    records: cleanDomain
      ? [
          {
            type: 'SPF',
            host: `@ (${cleanDomain})`,
            value: 'v=spf1 include:_spf.google.com include:send.b2cmail.vn ~all',
            status: 'verified' as const,
          },
          {
            type: 'DKIM',
            host: `google._domainkey.${cleanDomain}`,
            value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
            status: 'verified' as const,
          },
          {
            type: 'DMARC',
            host: `_dmarc.${cleanDomain}`,
            value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${cleanDomain}; pct=100`,
            status: 'verified' as const,
          },
        ]
      : [],
  };
}
