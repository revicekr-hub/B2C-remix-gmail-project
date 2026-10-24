import {
  CampaignComputedKpis,
  CampaignLifecycleStatus,
  EnterpriseCampaignRecord,
  ReceivedInboxMessage,
  ReceivedMessageTag,
  ReceivedQuickFilter,
  SavedRecipient,
} from '../types';

const BANNED_GMAIL_CATEGORIES = new Set([
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'SPAM',
  'TRASH',
]);

/**
 * Filter Gmail API messages: Must include INBOX and exclude CATEGORY_PROMOTIONS, CATEGORY_SOCIAL, SPAM
 */
export function shouldIncludeInReceivedInbox(gmailLabels: string[]): boolean {
  if (!Array.isArray(gmailLabels) || gmailLabels.length === 0) return false;
  const upper = gmailLabels.map((l) => l.trim().toUpperCase());
  if (!upper.includes('INBOX')) return false;
  for (const label of upper) {
    if (BANNED_GMAIL_CATEGORIES.has(label)) {
      return false;
    }
  }
  return true;
}

/**
 * Normalize email subject for reply matching (strips Re:, Fwd:, Trả lời:, prefixes & merge tags)
 */
export function normalizeSubjectForMatching(subject: string): string {
  if (!subject) return '';
  return subject
    .replace(/^((re|fwd|fw|trả lời|chuyển tiếp)\s*:\s*)+/gi, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Detect if an incoming message is a Bounce notification from mailer-daemon / postmaster
 */
export function isMailerDaemonBounce(fromEmail: string, subject: string): boolean {
  const emailLower = (fromEmail || '').toLowerCase();
  const subjLower = (subject || '').toLowerCase();
  if (
    emailLower.includes('mailer-daemon') ||
    emailLower.includes('postmaster@') ||
    subjLower.includes('delivery status notification') ||
    subjLower.includes('undeliverable') ||
    subjLower.includes('không thể gửi thư')
  ) {
    return true;
  }
  return false;
}

/**
 * Auto-classify a received message against known Campaigns and CRM Recipients
 */
export function classifyReceivedMessage(
  msg: Pick<
    ReceivedInboxMessage,
    'fromEmail' | 'subject' | 'threadId' | 'bodyText' | 'snippet'
  >,
  campaigns: EnterpriseCampaignRecord[],
  crmRecipients: SavedRecipient[] = []
): {
  autoTags: ReceivedMessageTag[];
  matchedCampaignId?: string;
  matchedCampaignName?: string;
  company?: string;
} {
  const tags: ReceivedMessageTag[] = [];
  const senderEmail = (msg.fromEmail || '').trim().toLowerCase();
  const normalizedMsgSubj = normalizeSubjectForMatching(msg.subject);

  let matchedCampaignId: string | undefined;
  let matchedCampaignName: string | undefined;
  let detectedRole: 'client' | 'partner' | undefined;
  let detectedCompany: string | undefined;

  // 1. Check bounce daemon first
  const isBounce = isMailerDaemonBounce(senderEmail, msg.subject);
  if (isBounce) {
    tags.push({
      type: 'bounce_daemon',
      label: '[Bị trả lại · Mailer-Daemon]',
    });
  }

  // 2. Match against campaigns by threadId, senderEmail, or normalized Subject
  for (const camp of campaigns) {
    const recipientMatch = camp.recipients.find(
      (r) =>
        r.threadId === msg.threadId ||
        r.email.toLowerCase() === senderEmail ||
        (isBounce &&
          ((msg.bodyText || '').toLowerCase().includes(r.email.toLowerCase()) ||
            (msg.snippet || '').toLowerCase().includes(r.email.toLowerCase())))
    );

    const campSubjNorm = normalizeSubjectForMatching(camp.subject);
    const subjectMatches =
      campSubjNorm.length > 6 &&
      normalizedMsgSubj.length > 6 &&
      (normalizedMsgSubj.includes(campSubjNorm.slice(0, 22)) ||
        campSubjNorm.includes(normalizedMsgSubj.slice(0, 22)));

    if (recipientMatch || subjectMatches) {
      if (!matchedCampaignId) {
        matchedCampaignId = camp.id;
        matchedCampaignName = camp.name;
      }
      if (recipientMatch) {
        detectedCompany = detectedCompany || recipientMatch.company;
        detectedRole =
          recipientMatch.roleType === 'partner' ? 'partner' : 'client';
      }
    }
  }

  // 3. Also check CRM savedRecipients if role/company not yet found
  if (!detectedRole) {
    const crmMatch = crmRecipients.find(
      (r) => r.email.toLowerCase() === senderEmail
    );
    if (crmMatch) {
      detectedCompany = detectedCompany || crmMatch.company;
      detectedRole = crmMatch.group === 'partner' ? 'partner' : 'client';
    }
  }

  // Add role tag: [Khách hàng] or [Đối tác]
  if (detectedRole === 'partner') {
    tags.push({
      type: 'partner',
      label: '[Đối tác]',
    });
  } else if (detectedRole === 'client') {
    tags.push({
      type: 'client',
      label: '[Khách hàng]',
    });
  }

  // Add campaign reply tag: [Phản hồi chiến dịch X]
  if (matchedCampaignId && matchedCampaignName) {
    tags.push({
      type: 'campaign_reply',
      label: `[Phản hồi ${matchedCampaignName}]`,
      campaignId: matchedCampaignId,
      campaignName: matchedCampaignName,
    });
  }

  return {
    autoTags: tags,
    matchedCampaignId,
    matchedCampaignName,
    company: detectedCompany,
  };
}

/**
 * Reconcile Campaign recipients with Received Inbox messages (matched by threadId, Subject, or Bounce)
 */
export function reconcileCampaignsWithReceivedMessages(
  campaigns: EnterpriseCampaignRecord[],
  receivedMessages: ReceivedInboxMessage[]
): EnterpriseCampaignRecord[] {
  return campaigns.map((campaign) => {
    const campSubjNorm = normalizeSubjectForMatching(campaign.subject);

    const updatedRecipients = campaign.recipients.map((rec) => {
      const recEmail = rec.email.toLowerCase();

      // Check if there is a bounce message mentioning this recipient or thread
      const bounceMsg = receivedMessages.find(
        (m) =>
          isMailerDaemonBounce(m.fromEmail, m.subject) &&
          (m.threadId === rec.threadId ||
            m.bodyText.toLowerCase().includes(recEmail) ||
            m.snippet.toLowerCase().includes(recEmail))
      );

      if (bounceMsg) {
        return {
          ...rec,
          deliveryStatus: 'bounced' as const,
          hasReplied: false,
          bounceReason:
            rec.bounceReason ||
            '550 5.1.1 The email account that you tried to reach does not exist (mailer-daemon)',
        };
      }

      // Check if there is a reply from this recipient on the same threadId or matching subject
      const replyMsg = receivedMessages.find((m) => {
        if (isMailerDaemonBounce(m.fromEmail, m.subject)) return false;
        const fromMatches = m.fromEmail.toLowerCase() === recEmail;
        if (!fromMatches) return false;
        if (m.threadId && rec.threadId && m.threadId === rec.threadId) {
          return true;
        }
        if (m.matchedCampaignId === campaign.id) {
          return true;
        }
        const msgSubjNorm = normalizeSubjectForMatching(m.subject);
        return (
          campSubjNorm.length > 6 &&
          msgSubjNorm.length > 6 &&
          (msgSubjNorm.includes(campSubjNorm.slice(0, 18)) ||
            campSubjNorm.includes(msgSubjNorm.slice(0, 18)))
        );
      });

      if (replyMsg) {
        return {
          ...rec,
          deliveryStatus: 'delivered' as const,
          hasReplied: true,
          repliedAtIso: replyMsg.receivedAtIso,
          replySnippet: replyMsg.snippet,
        };
      }

      return rec;
    });

    return {
      ...campaign,
      recipients: updatedRecipients,
    };
  });
}

/**
 * Compute KPI metrics for a single campaign or across all campaigns
 */
export function computeCampaignKpis(
  campaign: Pick<EnterpriseCampaignRecord, 'recipients'>
): CampaignComputedKpis {
  const totalSent = campaign.recipients.length;
  if (totalSent === 0) {
    return {
      totalSent: 0,
      deliveredCount: 0,
      bouncedCount: 0,
      repliedCount: 0,
      replyRatePercent: 0,
      deliveryRatePercent: 0,
      bounceRatePercent: 0,
    };
  }

  const bouncedCount = campaign.recipients.filter(
    (r) => r.deliveryStatus === 'bounced'
  ).length;
  const deliveredCount = campaign.recipients.filter(
    (r) => r.deliveryStatus === 'delivered'
  ).length;
  const repliedCount = campaign.recipients.filter((r) => r.hasReplied).length;

  const replyRatePercent = Number(((repliedCount / totalSent) * 100).toFixed(1));
  const deliveryRatePercent = Number(
    ((deliveredCount / totalSent) * 100).toFixed(1)
  );
  const bounceRatePercent = Number(
    ((bouncedCount / totalSent) * 100).toFixed(1)
  );

  return {
    totalSent,
    deliveredCount,
    bouncedCount,
    repliedCount,
    replyRatePercent,
    deliveryRatePercent,
    bounceRatePercent,
  };
}

/**
 * Filter campaigns by search query, status, and date range
 */
export function filterCampaigns(
  campaigns: EnterpriseCampaignRecord[],
  searchQuery: string,
  statusFilter: 'all' | CampaignLifecycleStatus,
  dateRangeFilter: 'all' | '7d' | '30d' | '90d',
  nowMs: number = Date.now()
): EnterpriseCampaignRecord[] {
  const q = searchQuery.trim().toLowerCase();

  return campaigns.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }

    if (q) {
      const hay = `${c.name} ${c.brandName} ${c.subject}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (dateRangeFilter !== 'all') {
      const launchedMs = new Date(c.launchedAtIso).getTime();
      if (!Number.isNaN(launchedMs)) {
        const diffDays = (nowMs - launchedMs) / (1000 * 60 * 60 * 24);
        if (dateRangeFilter === '7d' && diffDays > 7) return false;
        if (dateRangeFilter === '30d' && diffDays > 30) return false;
        if (dateRangeFilter === '90d' && diffDays > 90) return false;
      }
    }

    return true;
  });
}

/**
 * Filter Received Inbox messages by Quick Filter, Campaign ID, and search text
 */
export function filterReceivedMessages(
  messages: ReceivedInboxMessage[],
  quickFilter: ReceivedQuickFilter,
  campaignIdFilter: string,
  searchQuery: string = ''
): ReceivedInboxMessage[] {
  const q = searchQuery.trim().toLowerCase();

  return messages.filter((msg) => {
    // 1. Always enforce INBOX & non-Promotions/Social/Spam rule
    if (!shouldIncludeInReceivedInbox(msg.gmailLabels)) {
      return false;
    }

    // 2. Quick filter
    if (quickFilter === 'unread' && !msg.isUnread) return false;
    if (
      quickFilter === 'from_client' &&
      !msg.autoTags.some((t) => t.type === 'client')
    ) {
      return false;
    }
    if (
      quickFilter === 'from_partner' &&
      !msg.autoTags.some((t) => t.type === 'partner')
    ) {
      return false;
    }
    if (quickFilter === 'has_attachment' && msg.attachments.length === 0) {
      return false;
    }

    // 3. Campaign filter
    if (
      campaignIdFilter &&
      campaignIdFilter !== 'all' &&
      msg.matchedCampaignId !== campaignIdFilter
    ) {
      return false;
    }

    // 4. Search query
    if (q) {
      const hay = `${msg.fromName} ${msg.fromEmail} ${msg.company || ''} ${msg.subject} ${msg.snippet}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

// ============================================================================
// DETERMINISTIC SEED DATA FOR INDEXEDDB (OFFLINE-FIRST)
// ============================================================================

export const INITIAL_ENTERPRISE_CAMPAIGNS: EnterpriseCampaignRecord[] = [
  {
    id: 'camp-autumn-vip-01',
    name: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
    brandName: 'TechNova Lifestyle',
    subject: '🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
    preheader: 'Nhận ngay mã AUTUMN40 độc quyền và bộ phụ kiện 350.000đ cho đơn hàng doanh nghiệp.',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
    <strong style="color: #2563eb; font-size: 16px;">TechNova Lifestyle</strong>
    <span style="font-size: 11px; color: #64748b;">Chiến dịch B2B & VIP Mùa Thu</span>
  </div>
  <p style="font-size: 13px;">Kính chào Quý Khách hàng & Đối tác,</p>
  <p style="font-size: 13px;"><strong>TechNova Lifestyle</strong> trân trọng gửi tới Quý vị chương trình ưu đãi đặc quyền <strong>Giảm 40% toàn bộ Bộ sưu tập Mùa Thu 2026</strong> kèm quà tặng doanh nghiệp trị giá 350.000đ.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 14px 0; font-size: 12px;">
    <div>• Mã ưu đãi hợp đồng: <strong>AUTUMN40</strong></div>
    <div>• Bảng giá sỉ & каталог đính kèm bên dưới</div>
    <div>• Hỗ trợ xuất hóa đơn VAT & giao hàng tận nơi trong 24h</div>
  </div>
  <div style="text-align: center; margin: 18px 0;">
    <a href="https://technova.vn/offer" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Xác Nhận Đơn Hàng Ưu Đãi →</a>
  </div>
  <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 14px;">
    TechNova Lifestyle • Tầng 12 Saigon Centre, Q.1, TP.HCM • Hotline: 1900 6886
  </div>
</div>`,
    bodyText:
      'Kính chào Quý Khách hàng & Đối tác,\nTechNova Lifestyle gửi tặng ưu đãi giảm 40% BST Mùa Thu 2026 kèm quà tặng 350.000đ (Mã: AUTUMN40). Xem bảng giá đính kèm.',
    ctaText: 'Xác Nhận Đơn Hàng Ưu Đãi',
    ctaUrl: 'https://technova.vn/offer',
    launchedAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    openCount: 5,
    clickCount: 4,
    attachments: [
      {
        id: 'att-catalog-autumn',
        fileName: 'TechNova_Autumn_2026_B2B_Catalog.pdf',
        fileSizeLabel: '1.4 MB',
        mimeType: 'application/pdf',
        contentPreview:
          'BẢNG GIÁ B2B & CATALOG BỘ SƯU TẬP THU 2026 - TECHNOVA LIFESTYLE\n1. Áo khoác Blazer Executive: 1.290.000đ (Sau giảm 40%: 774.000đ)\n2. Bộ quà tặng phụ kiện da doanh nghiệp: Tặng kèm cho đơn từ 990.000đ\n3. Chính sách chiết khấu đại lý & đối tác chiến lược.',
      },
      {
        id: 'att-order-sheet',
        fileName: 'Mau_Dang_Ky_Don_Hang_VIP_AUTUMN40.csv',
        fileSizeLabel: '84 KB',
        mimeType: 'text/csv',
        contentPreview:
          'Ma_SP,Ten_San_Pham,So_Luong,Don_Gia_Goc,Gia_Uu_Dai_40\nTN-01,Blazer Executive Navy,20,1290000,774000\nTN-02,Tui_Da_Cong_So_Pro,15,1550000,930000',
      },
    ],
    recipients: [
      {
        id: 'c1-rec-1',
        name: 'Nguyễn Minh Anh',
        email: 'minhanh.vip@technova-client.vn',
        company: 'TechNova Retail Corp',
        roleType: 'client',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-autumn-minhanh-001',
        hasReplied: true,
        repliedAtIso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        replySnippet:
          'Chào đội ngũ TechNova, bên mình muốn đặt 35 bộ quà tặng thu cho khối Quản lý kèm mã AUTUMN40. Gửi giúp mình hợp đồng nhé!',
      },
      {
        id: 'c1-rec-2',
        name: 'Trần Hoàng Nam',
        email: 'hoangnam.ceo@luxfashion.vn',
        company: 'LuxFashion Retail',
        roleType: 'partner',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-autumn-hoangnam-002',
        hasReplied: true,
        repliedAtIso: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
        replySnippet:
          'Đã nhận được catalog đính kèm. LuxFashion đồng ý nhập lô 120 sản phẩm đợt 1, vui lòng xuất hóa đơn VAT theo thông tin đính kèm.',
      },
      {
        id: 'c1-rec-3',
        name: 'Lê Thu Hà',
        email: 'thuha.le@aurorabeauty.vn',
        company: 'Aurora Beauty Group',
        roleType: 'client',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-autumn-thuha-003',
        hasReplied: true,
        repliedAtIso: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        replySnippet:
          'Cảm ơn TechNova, cho mình hỏi mã AUTUMN40 có áp dụng đồng thời với thẻ thành viên Platinum của Aurora Beauty không?',
      },
      {
        id: 'c1-rec-4',
        name: 'Phạm Quốc Bảo',
        email: 'quocbao.partner@globaltrade.vn',
        company: 'GlobalTrade Logistics',
        roleType: 'partner',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-autumn-quocbao-004',
        hasReplied: false,
      },
      {
        id: 'c1-rec-5',
        name: 'Vũ Ngọc Bích',
        email: 'ngocbich.vu@saigonpearl-living.vn',
        company: 'Saigon Pearl Living',
        roleType: 'client',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-autumn-ngocbich-005',
        hasReplied: false,
      },
      {
        id: 'c1-rec-6',
        name: 'Đặng Tuấn Kiệt',
        email: 'tuankiet.old@invalid-domain-corp.vn',
        company: 'KietHoldings',
        roleType: 'client',
        deliveryStatus: 'bounced',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-autumn-bounce-006',
        hasReplied: false,
        bounceReason:
          '550 5.1.1 Address rejected: tuankiet.old@invalid-domain-corp.vn (Phát hiện từ mailer-daemon@googlemail.com)',
      },
    ],
    timelineSeries: [
      { dateLabel: 'Ngày 1 (20/10)', sent: 6, opened: 3, clicked: 2, replied: 1, bounced: 1 },
      { dateLabel: 'Ngày 2 (21/10)', sent: 0, opened: 4, clicked: 3, replied: 2, bounced: 0 },
      { dateLabel: 'Ngày 3 (22/10)', sent: 0, opened: 5, clicked: 4, replied: 3, bounced: 0 },
      { dateLabel: 'Hôm nay (23/10)', sent: 0, opened: 5, clicked: 4, replied: 3, bounced: 0 },
    ],
  },
  {
    id: 'camp-cloudscale-q4-02',
    name: 'Chiến dịch Đối tác B2B CloudScale AI Suite Q4',
    brandName: 'CloudScale B2B Suite',
    subject: '🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
    preheader: 'Giải pháp tự động hóa quy trình vận hành cho đối tác chiến lược Q4/2026.',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff;">
  <h3 style="color: #4f46e5; margin: 0 0 10px 0;">CloudScale B2B Enterprise</h3>
  <p style="font-size: 13px;">Kính gửi Ban Giám đốc & Khối Công nghệ,</p>
  <p style="font-size: 13px;">CloudScale trân trọng gửi tới Quý Đối tác gói nâng cấp hạ tầng <strong>Enterprise Cloud Q4</strong> cùng ưu đãi miễn phí 03 tháng đầu tiên (Mã: <strong>B2BCLOUD3M</strong>).</p>
  <p style="font-size: 12px; color: #475569;">Tài liệu kiến trúc bảo mật ISO 27001 được đính kèm trong thư này.</p>
</div>`,
    bodyText:
      'Kính gửi Ban Giám đốc,\nCloudScale gửi đề xuất hợp tác tích hợp ERP & tặng 3 tháng Enterprise (Mã: B2BCLOUD3M).',
    ctaText: 'Đặt Lịch Demo Kỹ Thuật',
    ctaUrl: 'https://cloudscale.io/enterprise-demo',
    launchedAtIso: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'running',
    openCount: 4,
    clickCount: 3,
    attachments: [
      {
        id: 'att-cloud-sla',
        fileName: 'CloudScale_SLA_ISO27001_Architecture.pdf',
        fileSizeLabel: '2.1 MB',
        mimeType: 'application/pdf',
        contentPreview:
          'TÀI LIỆU KIẾN TRÚC KỸ THUẬT & CAM KẾT SLA 99.99% - CLOUDSCALE B2B SUITE\n- Chứng nhận bảo mật ISO/IEC 27001\n- Tích hợp SSO SAML 2.0 & Google Workspace\n- Hỗ trợ kỹ thuật 24/7.',
      },
    ],
    recipients: [
      {
        id: 'c2-rec-1',
        name: 'Phạm Quốc Bảo',
        email: 'quocbao.partner@globaltrade.vn',
        company: 'GlobalTrade Logistics',
        roleType: 'partner',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-cloud-quocbao-101',
        hasReplied: true,
        repliedAtIso: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        replySnippet:
          'Chào CloudScale, đội IT của GlobalTrade muốn hẹn lịch demo tích hợp API vào 14h chiều thứ Sáu tuần này.',
      },
      {
        id: 'c2-rec-2',
        name: 'Hoàng Gia Huy',
        email: 'giahuy.cto@fintechviet.vn',
        company: 'FinTechViet Corp',
        roleType: 'partner',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-cloud-giahuy-102',
        hasReplied: true,
        repliedAtIso: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        replySnippet:
          'Mình đã xem file SLA đính kèm. Gửi thêm cho mình bảng báo giá gói 250 seats nhé.',
      },
      {
        id: 'c2-rec-3',
        name: 'Trần Hoàng Nam',
        email: 'hoangnam.ceo@luxfashion.vn',
        company: 'LuxFashion Retail',
        roleType: 'partner',
        deliveryStatus: 'delivered',
        sentAtIso: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-cloud-hoangnam-103',
        hasReplied: false,
      },
      {
        id: 'c2-rec-4',
        name: 'Lý Minh Khôi',
        email: 'minhkhoi@decommissioned-server.vn',
        company: 'Delta Supply Chain',
        roleType: 'partner',
        deliveryStatus: 'bounced',
        sentAtIso: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        threadId: 'thread-cloud-bounce-104',
        hasReplied: false,
        bounceReason: '554 5.4.6 Hop count exceeded - possible mail loop (mailer-daemon)',
      },
    ],
    timelineSeries: [
      { dateLabel: 'Hôm qua (22/10)', sent: 4, opened: 2, clicked: 2, replied: 1, bounced: 1 },
      { dateLabel: 'Hôm nay (23/10)', sent: 0, opened: 4, clicked: 3, replied: 2, bounced: 0 },
    ],
  },
  {
    id: 'camp-lumiere-spa-03',
    name: 'Chiến dịch Tri ân Thành viên Lumière Luxury Spa',
    brandName: 'Lumière Luxury Spa & Clinic',
    subject: '🌿 [Lumière Spa] Thư mời Trải nghiệm Liệu trình Trẻ hóa Thụy Sĩ (Ưu đãi 50%)',
    preheader: 'Dành tặng riêng 50 khách hàng Platinum trong tháng 11.',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; color: #1f2937; padding: 18px; border: 1px solid #d1fae5; border-radius: 10px; background: #ffffff;">
  <h3 style="color: #059669; margin: 0 0 8px 0;">Lumière Luxury Spa & Clinic</h3>
  <p style="font-size: 13px;">Thư mời đặc quyền trải nghiệm liệu trình trẻ hóa tế bào gốc Thụy Sĩ với mã ưu đãi <strong>LUMIERE50</strong>.</p>
</div>`,
    bodyText: 'Thư mời trải nghiệm liệu trình trẻ hóa Thụy Sĩ ưu đãi 50% với mã LUMIERE50.',
    ctaText: 'Đặt Lịch Hẹn Đặc Quyền',
    ctaUrl: 'https://lumierespa.vn/booking',
    launchedAtIso: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'draft',
    openCount: 0,
    clickCount: 0,
    attachments: [
      {
        id: 'att-lumiere-voucher',
        fileName: 'Voucher_Platinum_LumiereSpa_50Off.pdf',
        fileSizeLabel: '620 KB',
        mimeType: 'application/pdf',
        contentPreview: 'VOUCHER VIP LUMIERE LUXURY SPA - GIẢM 50% LIỆU TRÌNH THỤY SĨ (MÃ: LUMIERE50)',
      },
    ],
    recipients: [
      {
        id: 'c3-rec-1',
        name: 'Nguyễn Minh Anh',
        email: 'minhanh.vip@technova-client.vn',
        company: 'TechNova Retail Corp',
        roleType: 'client',
        deliveryStatus: 'pending',
        sentAtIso: new Date().toISOString(),
        threadId: 'thread-lumiere-001',
        hasReplied: false,
      },
      {
        id: 'c3-rec-2',
        name: 'Vũ Ngọc Bích',
        email: 'ngocbich.vu@saigonpearl-living.vn',
        company: 'Saigon Pearl Living',
        roleType: 'client',
        deliveryStatus: 'pending',
        sentAtIso: new Date().toISOString(),
        threadId: 'thread-lumiere-002',
        hasReplied: false,
      },
    ],
    timelineSeries: [
      { dateLabel: 'Dự kiến Ngày 1', sent: 2, opened: 0, clicked: 0, replied: 0, bounced: 0 },
    ],
  },
];

export const INITIAL_RECEIVED_INBOX_MESSAGES: ReceivedInboxMessage[] = [
  {
    id: 'rx-msg-01',
    gmailMessageId: '18f92a01b2c001',
    threadId: 'thread-autumn-hoangnam-002',
    fromName: 'Trần Hoàng Nam (CEO LuxFashion)',
    fromEmail: 'hoangnam.ceo@luxfashion.vn',
    company: 'LuxFashion Retail',
    toEmail: 'marketing@b2cmail.vn',
    subject:
      'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
    snippet:
      'Đã nhận được catalog đính kèm. LuxFashion đồng ý nhập lô 120 sản phẩm đợt 1, vui lòng xuất hóa đơn VAT theo thông tin đính kèm.',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.65;">
  <p>Chào bộ phận Kinh doanh B2B <strong>TechNova Lifestyle</strong>,</p>
  <p>Tôi đã xem kỹ <em>TechNova_Autumn_2026_B2B_Catalog.pdf</em> mà các bạn gửi trong chiến dịch ưu đãi mùa thu.</p>
  <p>Bên <strong>LuxFashion Retail</strong> thống nhất đặt đơn hàng sỉ đợt 1 gồm:</p>
  <ul>
    <li><strong>80 bộ</strong> Blazer Executive Navy (Áp dụng mã <code>AUTUMN40</code> giảm 40%)</li>
    <li><strong>40 bộ</strong> Túi Da Công Sở Pro + Bộ quà tặng phụ kiện 350.000đ</li>
  </ul>
  <p>Tôi đính kèm bên dưới <strong>Đơn đặt hàng PO #LF-2026-089</strong> đã ký số và thông tin xuất hóa đơn VAT. Nhờ đội ngũ xác nhận lịch giao hàng trước thứ Sáu tuần này.</p>
  <p>Trân trọng,<br/><strong>Trần Hoàng Nam</strong><br/>Tổng Giám đốc · LuxFashion Retail</p>
</div>`,
    bodyText:
      'Chào bộ phận Kinh doanh B2B TechNova Lifestyle,\nTôi đã xem kỹ Catalog. Bên LuxFashion Retail thống nhất đặt đơn hàng sỉ đợt 1 gồm 80 bộ Blazer Executive và 40 bộ Túi Da Công Sở Pro kèm mã AUTUMN40. Tôi đính kèm PO #LF-2026-089.',
    receivedAtIso: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    isUnread: true,
    isStarred: true,
    gmailLabels: ['INBOX', 'IMPORTANT'],
    matchedCampaignId: 'camp-autumn-vip-01',
    matchedCampaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
    autoTags: [
      { type: 'partner', label: '[Đối tác]' },
      {
        type: 'campaign_reply',
        label: '[Phản hồi Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova]',
        campaignId: 'camp-autumn-vip-01',
        campaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
      },
    ],
    attachments: [
      {
        id: 'att-po-luxfashion',
        fileName: 'PO_LF_2026_089_LuxFashion_Signed.pdf',
        fileSizeLabel: '412 KB',
        mimeType: 'application/pdf',
        contentPreview:
          'PURCHASE ORDER #LF-2026-089\nĐơn vị mua: Công ty CP Bán lẻ LuxFashion Retail\nMã số thuế: 0314892104\nTổng giá trị sau chiết khấu AUTUMN40: 99.120.000 VNĐ\nTrạng thái: Đã ký duyệt bởi CEO Trần Hoàng Nam.',
      },
      {
        id: 'att-vat-info',
        fileName: 'Thong_Tin_Xuat_VAT_LuxFashion.txt',
        fileSizeLabel: '18 KB',
        mimeType: 'text/plain',
        contentPreview:
          'Tên đơn vị: CÔNG TY CỔ PHẦN BÁN LẺ LUXFASHION\nMST: 0314892104\nĐịa chỉ: 88 Đồng Khởi, Quận 1, TP. Hồ Chí Minh\nEmail nhận hóa đơn điện tử: accounting@luxfashion.vn',
      },
    ],
    threadHistory: [
      {
        id: 'th-item-1',
        senderName: 'B2Cmail · TechNova Lifestyle',
        senderEmail: 'marketing@b2cmail.vn',
        recipientEmail: 'hoangnam.ceo@luxfashion.vn',
        direction: 'outbound_campaign',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        subject:
          '🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
        bodyHtml:
          '<p>Kính gửi anh Trần Hoàng Nam (LuxFashion Retail), TechNova gửi tặng ưu đãi 40% BST Mùa Thu kèm quà tặng phụ kiện 350K với mã <strong>AUTUMN40</strong>.</p>',
        bodyText:
          'Kính gửi anh Trần Hoàng Nam (LuxFashion Retail), TechNova gửi tặng ưu đãi 40% BST Mùa Thu kèm quà tặng phụ kiện 350K với mã AUTUMN40.',
      },
      {
        id: 'th-item-2',
        senderName: 'Trần Hoàng Nam (CEO LuxFashion)',
        senderEmail: 'hoangnam.ceo@luxfashion.vn',
        recipientEmail: 'marketing@b2cmail.vn',
        direction: 'inbound_reply',
        sentAtIso: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
        subject:
          'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
        bodyHtml:
          '<p>Đã nhận được catalog đính kèm. LuxFashion đồng ý nhập lô 120 sản phẩm đợt 1, vui lòng xuất hóa đơn VAT theo thông tin đính kèm.</p>',
        bodyText:
          'Đã nhận được catalog đính kèm. LuxFashion đồng ý nhập lô 120 sản phẩm đợt 1, vui lòng xuất hóa đơn VAT theo thông tin đính kèm.',
      },
    ],
  },
  {
    id: 'rx-msg-02',
    gmailMessageId: '18f92a01b2c002',
    threadId: 'thread-autumn-minhanh-001',
    fromName: 'Nguyễn Minh Anh',
    fromEmail: 'minhanh.vip@technova-client.vn',
    company: 'TechNova Retail Corp',
    toEmail: 'marketing@b2cmail.vn',
    subject:
      'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Nguyễn Minh Anh',
    snippet:
      'Chào đội ngũ TechNova, bên mình muốn đặt 35 bộ quà tặng thu cho khối Quản lý kèm mã AUTUMN40. Gửi giúp mình hợp đồng nhé!',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.65;">
  <p>Chào đội ngũ chăm sóc khách hàng VIP <strong>TechNova Lifestyle</strong>,</p>
  <p>Cảm ơn chương trình ưu đãi rất kịp thời của các bạn. Phòng Nhân sự bên mình đang chuẩn bị quà tri ân Quý 4 cho <strong>35 anh/chị Quản lý cấp cao</strong>.</p>
  <p>Mình đính kèm danh sách size áo và màu sắc mong muốn. Nhờ bên bạn áp dụng mã <code>AUTUMN40</code> và gửi lại bản dự thảo Hợp đồng mua bán trong hôm nay nhé!</p>
  <p>Thân mến,<br/><strong>Nguyễn Minh Anh</strong> — Giám đốc Nhân sự</p>
</div>`,
    bodyText:
      'Chào đội ngũ TechNova, bên mình muốn đặt 35 bộ quà tặng thu cho khối Quản lý kèm mã AUTUMN40. Gửi giúp mình hợp đồng nhé!',
    receivedAtIso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isUnread: true,
    isStarred: false,
    gmailLabels: ['INBOX'],
    matchedCampaignId: 'camp-autumn-vip-01',
    matchedCampaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
    autoTags: [
      { type: 'client', label: '[Khách hàng]' },
      {
        type: 'campaign_reply',
        label: '[Phản hồi Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova]',
        campaignId: 'camp-autumn-vip-01',
        campaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
      },
    ],
    attachments: [
      {
        id: 'att-minhanh-sizes',
        fileName: 'Danh_Sach_35_Suat_Qua_Quan_Ly.csv',
        fileSizeLabel: '29 KB',
        mimeType: 'text/csv',
        contentPreview:
          'STT,Ho_Ten_Quan_Ly,Phong_Ban,Size_Blazer,Mau_Phu_Kien\n1,Nguyen Van A,Kinh Doanh,L,Den\n2,Tran Thi B,Tai Chinh,M,Nau_Cognac',
      },
    ],
    threadHistory: [
      {
        id: 'th-ma-1',
        senderName: 'B2Cmail · TechNova Lifestyle',
        senderEmail: 'marketing@b2cmail.vn',
        recipientEmail: 'minhanh.vip@technova-client.vn',
        direction: 'outbound_campaign',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        subject: '🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Nguyễn Minh Anh',
        bodyHtml:
          '<p>Chào Nguyễn Minh Anh, TechNova gửi tặng bạn mã ưu đãi <strong>AUTUMN40</strong> giảm 40% toàn bộ BST Thu.</p>',
        bodyText: 'Chào Nguyễn Minh Anh, TechNova gửi tặng bạn mã ưu đãi AUTUMN40 giảm 40% toàn bộ BST Thu.',
      },
      {
        id: 'th-ma-2',
        senderName: 'Nguyễn Minh Anh',
        senderEmail: 'minhanh.vip@technova-client.vn',
        recipientEmail: 'marketing@b2cmail.vn',
        direction: 'inbound_reply',
        sentAtIso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        subject: 'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Nguyễn Minh Anh',
        bodyHtml:
          '<p>Chào đội ngũ TechNova, bên mình muốn đặt 35 bộ quà tặng thu cho khối Quản lý kèm mã AUTUMN40. Gửi giúp mình hợp đồng nhé!</p>',
        bodyText:
          'Chào đội ngũ TechNova, bên mình muốn đặt 35 bộ quà tặng thu cho khối Quản lý kèm mã AUTUMN40. Gửi giúp mình hợp đồng nhé!',
      },
    ],
  },
  {
    id: 'rx-msg-03',
    gmailMessageId: '18f92a01b2c003',
    threadId: 'thread-cloud-quocbao-101',
    fromName: 'Phạm Quốc Bảo (GlobalTrade Logistics)',
    fromEmail: 'quocbao.partner@globaltrade.vn',
    company: 'GlobalTrade Logistics',
    toEmail: 'enterprise@b2cmail.vn',
    subject:
      'Re: 🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
    snippet:
      'Chào CloudScale, đội IT của GlobalTrade muốn hẹn lịch demo tích hợp API vào 14h chiều thứ Sáu tuần này.',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.65;">
  <p>Chào đội ngũ Giải pháp Doanh nghiệp <strong>CloudScale B2B</strong>,</p>
  <p>Chúng tôi đánh giá rất cao tài liệu kiến trúc bảo mật ISO 27001 mà bên bạn đính kèm trong email chiến dịch.</p>
  <p>Hiện tại <strong>GlobalTrade Logistics</strong> đang vận hành 14 kho bãi và cần đồng bộ dữ liệu thời gian thực qua Webhook. Đề xuất buổi <strong>Live Technical Demo</strong> vào lúc <strong>14:00 Thứ Sáu tuần này</strong> qua Google Meet.</p>
  <p>Trân trọng,<br/><strong>Phạm Quốc Bảo</strong> — Giám đốc Vận hành & Đối tác Chiến lược</p>
</div>`,
    bodyText:
      'Chào CloudScale, đội IT của GlobalTrade muốn hẹn lịch demo tích hợp API vào 14h chiều thứ Sáu tuần này.',
    receivedAtIso: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isUnread: false,
    isStarred: true,
    gmailLabels: ['INBOX', 'IMPORTANT'],
    matchedCampaignId: 'camp-cloudscale-q4-02',
    matchedCampaignName: 'Chiến dịch Đối tác B2B CloudScale AI Suite Q4',
    autoTags: [
      { type: 'partner', label: '[Đối tác]' },
      {
        type: 'campaign_reply',
        label: '[Phản hồi Chiến dịch Đối tác B2B CloudScale AI Suite Q4]',
        campaignId: 'camp-cloudscale-q4-02',
        campaignName: 'Chiến dịch Đối tác B2B CloudScale AI Suite Q4',
      },
    ],
    attachments: [],
    threadHistory: [
      {
        id: 'th-qb-1',
        senderName: 'CloudScale B2B Suite',
        senderEmail: 'enterprise@b2cmail.vn',
        recipientEmail: 'quocbao.partner@globaltrade.vn',
        direction: 'outbound_campaign',
        sentAtIso: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        subject: '🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
        bodyHtml:
          '<p>Kính gửi anh Phạm Quốc Bảo, CloudScale gửi đề xuất tích hợp ERP kèm 3 tháng miễn phí gói Enterprise.</p>',
        bodyText:
          'Kính gửi anh Phạm Quốc Bảo, CloudScale gửi đề xuất tích hợp ERP kèm 3 tháng miễn phí gói Enterprise.',
      },
      {
        id: 'th-qb-2',
        senderName: 'Phạm Quốc Bảo (GlobalTrade Logistics)',
        senderEmail: 'quocbao.partner@globaltrade.vn',
        recipientEmail: 'enterprise@b2cmail.vn',
        direction: 'inbound_reply',
        sentAtIso: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        subject:
          'Re: 🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
        bodyHtml:
          '<p>Chào CloudScale, đội IT của GlobalTrade muốn hẹn lịch demo tích hợp API vào 14h chiều thứ Sáu tuần này.</p>',
        bodyText:
          'Chào CloudScale, đội IT của GlobalTrade muốn hẹn lịch demo tích hợp API vào 14h chiều thứ Sáu tuần này.',
      },
    ],
  },
  {
    id: 'rx-msg-04',
    gmailMessageId: '18f92a01b2c004',
    threadId: 'thread-autumn-thuha-003',
    fromName: 'Lê Thu Hà (Aurora Beauty Group)',
    fromEmail: 'thuha.le@aurorabeauty.vn',
    company: 'Aurora Beauty Group',
    toEmail: 'marketing@b2cmail.vn',
    subject:
      'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
    snippet:
      'Cảm ơn TechNova, cho mình hỏi mã AUTUMN40 có áp dụng đồng thời với thẻ thành viên Platinum của Aurora Beauty không?',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.65;">
  <p>Chào TechNova Lifestyle,</p>
  <p>Mình vừa nhận được email thông báo chương trình giảm 40% Bộ sưu tập Thu. Cho mình hỏi mã <strong>AUTUMN40</strong> có được cộng dồn chiết khấu 5% thẻ thành viên Platinum của Aurora Beauty Group không?</p>
  <p>Cảm ơn team,<br/><strong>Lê Thu Hà</strong></p>
</div>`,
    bodyText:
      'Cảm ơn TechNova, cho mình hỏi mã AUTUMN40 có áp dụng đồng thời với thẻ thành viên Platinum của Aurora Beauty không?',
    receivedAtIso: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isUnread: false,
    isStarred: false,
    gmailLabels: ['INBOX'],
    matchedCampaignId: 'camp-autumn-vip-01',
    matchedCampaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
    autoTags: [
      { type: 'client', label: '[Khách hàng]' },
      {
        type: 'campaign_reply',
        label: '[Phản hồi Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova]',
        campaignId: 'camp-autumn-vip-01',
        campaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
      },
    ],
    attachments: [],
    threadHistory: [
      {
        id: 'th-th-1',
        senderName: 'B2Cmail · TechNova Lifestyle',
        senderEmail: 'marketing@b2cmail.vn',
        recipientEmail: 'thuha.le@aurorabeauty.vn',
        direction: 'outbound_campaign',
        sentAtIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        subject:
          '🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
        bodyHtml: '<p>TechNova gửi tặng chị Lê Thu Hà mã ưu đãi AUTUMN40.</p>',
        bodyText: 'TechNova gửi tặng chị Lê Thu Hà mã ưu đãi AUTUMN40.',
      },
      {
        id: 'th-th-2',
        senderName: 'Lê Thu Hà (Aurora Beauty Group)',
        senderEmail: 'thuha.le@aurorabeauty.vn',
        recipientEmail: 'marketing@b2cmail.vn',
        direction: 'inbound_reply',
        sentAtIso: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        subject:
          'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
        bodyHtml:
          '<p>Cảm ơn TechNova, cho mình hỏi mã AUTUMN40 có áp dụng đồng thời với thẻ thành viên Platinum của Aurora Beauty không?</p>',
        bodyText:
          'Cảm ơn TechNova, cho mình hỏi mã AUTUMN40 có áp dụng đồng thời với thẻ thành viên Platinum của Aurora Beauty không?',
      },
    ],
  },
  {
    id: 'rx-msg-05',
    gmailMessageId: '18f92a01b2c005',
    threadId: 'thread-cloud-giahuy-102',
    fromName: 'Hoàng Gia Huy (CTO FinTechViet)',
    fromEmail: 'giahuy.cto@fintechviet.vn',
    company: 'FinTechViet Corp',
    toEmail: 'enterprise@b2cmail.vn',
    subject:
      'Re: 🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
    snippet:
      'Mình đã xem file SLA đính kèm. Gửi thêm cho mình bảng báo giá gói 250 seats kèm yêu cầu kỹ thuật đính kèm nhé.',
    bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.65;">
  <p>Chào team CloudScale,</p>
  <p>Mình đã đọc tài liệu SLA 99.99% và kiến trúc bảo mật ISO 27001. Hiện FinTechViet đang có nhu cầu triển khai cho <strong>250 kỹ sư & vận hành viên</strong>.</p>
  <p>Mình đính kèm <em>Checklist Bảo mật Ngân hàng</em> để bên bạn điền thông tin trước buổi ký kết nhé.</p>
  <p>Best regards,<br/><strong>Hoàng Gia Huy</strong> — CTO, FinTechViet Corp</p>
</div>`,
    bodyText:
      'Mình đã xem file SLA đính kèm. Gửi thêm cho mình bảng báo giá gói 250 seats nhé.',
    receivedAtIso: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isUnread: true,
    isStarred: true,
    gmailLabels: ['INBOX'],
    matchedCampaignId: 'camp-cloudscale-q4-02',
    matchedCampaignName: 'Chiến dịch Đối tác B2B CloudScale AI Suite Q4',
    autoTags: [
      { type: 'partner', label: '[Đối tác]' },
      {
        type: 'campaign_reply',
        label: '[Phản hồi Chiến dịch Đối tác B2B CloudScale AI Suite Q4]',
        campaignId: 'camp-cloudscale-q4-02',
        campaignName: 'Chiến dịch Đối tác B2B CloudScale AI Suite Q4',
      },
    ],
    attachments: [
      {
        id: 'att-fintech-security',
        fileName: 'FinTechViet_Vendor_Security_Checklist_2026.json',
        fileSizeLabel: '54 KB',
        mimeType: 'application/json',
        contentPreview: JSON.stringify(
          {
            vendor: 'CloudScale B2B Suite',
            complianceRequired: ['ISO-27001', 'SOC2-Type2', 'GDPR'],
            requestedSeats: 250,
            contact: 'giahuy.cto@fintechviet.vn',
          },
          null,
          2
        ),
      },
    ],
    threadHistory: [
      {
        id: 'th-gh-1',
        senderName: 'CloudScale B2B Suite',
        senderEmail: 'enterprise@b2cmail.vn',
        recipientEmail: 'giahuy.cto@fintechviet.vn',
        direction: 'outbound_campaign',
        sentAtIso: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        subject: '🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
        bodyHtml: '<p>Đề xuất hợp tác CloudScale B2B Suite Q4/2026.</p>',
        bodyText: 'Đề xuất hợp tác CloudScale B2B Suite Q4/2026.',
      },
      {
        id: 'th-gh-2',
        senderName: 'Hoàng Gia Huy (CTO FinTechViet)',
        senderEmail: 'giahuy.cto@fintechviet.vn',
        recipientEmail: 'enterprise@b2cmail.vn',
        direction: 'inbound_reply',
        sentAtIso: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        subject:
          'Re: 🚀 [CloudScale B2B] Đề xuất hợp tác tích hợp ERP & Tặng 3 tháng Enterprise',
        bodyHtml:
          '<p>Mình đã xem file SLA đính kèm. Gửi thêm cho mình bảng báo giá gói 250 seats nhé.</p>',
        bodyText:
          'Mình đã xem file SLA đính kèm. Gửi thêm cho mình bảng báo giá gói 250 seats nhé.',
      },
    ],
  },
  {
    id: 'rx-msg-06-bounce',
    gmailMessageId: '18f92a01b2c006',
    threadId: 'thread-autumn-bounce-006',
    fromName: 'Mail Delivery Subsystem',
    fromEmail: 'mailer-daemon@googlemail.com',
    company: 'Google Mailer Daemon',
    toEmail: 'marketing@b2cmail.vn',
    subject: 'Delivery Status Notification (Failure) - tuankiet.old@invalid-domain-corp.vn',
    snippet:
      'Address not found: Your message wasn’t delivered to tuankiet.old@invalid-domain-corp.vn because the domain invalid-domain-corp.vn couldn’t be found.',
    bodyHtml: `<div style="font-family: monospace; font-size: 12px; color: #991b1b; background: #fef2f2; padding: 14px; border: 1px solid #fecaca; border-radius: 8px;">
  <strong>Delivery incomplete / Thư bị trả lại (Bounced)</strong><br/><br/>
  Không thể gửi thư tới địa chỉ: <strong>tuankiet.old@invalid-domain-corp.vn</strong><br/>
  Chiến dịch liên quan: <em>Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova</em><br/>
  Mã phản hồi SMTP: <code>550 5.1.1 The email account that you tried to reach does not exist.</code>
</div>`,
    bodyText:
      'Delivery Status Notification (Failure) for tuankiet.old@invalid-domain-corp.vn. 550 5.1.1 The email account does not exist.',
    receivedAtIso: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
    isUnread: false,
    isStarred: false,
    gmailLabels: ['INBOX'],
    matchedCampaignId: 'camp-autumn-vip-01',
    matchedCampaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
    autoTags: [
      { type: 'bounce_daemon', label: '[Bị trả lại · Mailer-Daemon]' },
      {
        type: 'campaign_reply',
        label: '[Phản hồi Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova]',
        campaignId: 'camp-autumn-vip-01',
        campaignName: 'Chiến dịch Thu VIP 2026 - Ưu đãi 40% TechNova',
      },
    ],
    attachments: [],
    threadHistory: [
      {
        id: 'th-b-1',
        senderName: 'Mail Delivery Subsystem',
        senderEmail: 'mailer-daemon@googlemail.com',
        recipientEmail: 'marketing@b2cmail.vn',
        direction: 'inbound_reply',
        sentAtIso: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
        subject: 'Delivery Status Notification (Failure) - tuankiet.old@invalid-domain-corp.vn',
        bodyHtml:
          '<p>550 5.1.1 The email account tuankiet.old@invalid-domain-corp.vn does not exist.</p>',
        bodyText:
          '550 5.1.1 The email account tuankiet.old@invalid-domain-corp.vn does not exist.',
      },
    ],
  },
];
