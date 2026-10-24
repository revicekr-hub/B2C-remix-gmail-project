import {
  RecommendedTimeSlot,
  SavedRecipient,
  ScheduledEmailPlan,
  SendTimeTip,
  RecipientGroup,
} from '../types';

export const DEFAULT_SAVED_RECIPIENTS: SavedRecipient[] = [];

export const RECIPIENT_GROUP_LABELS: Record<RecipientGroup, string> = {
  all: 'Tất cả nhóm',
  vip: 'Khách VIP',
  loyal: 'Khách thân thiết',
  new_lead: 'Khách mới (Lead)',
  partner: 'Đối tác B2B',
};

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Parse a single or multi-line / comma-separated input string into recipient objects.
 * Supports formats like:
 * - "ten@domain.com"
 * - "Nguyễn Văn A <vana@domain.com>"
 * - "Nguyễn Văn A, vana@domain.com"
 * - "Nguyễn Văn A, vana@domain.com, Công ty ABC, VIP40"
 * - Multiple entries separated by semicolon, newline, or comma
 */
export function parseBulkRecipientsInput(
  rawInput: string,
  defaultGroup: RecipientGroup = 'vip'
): { valid: Omit<SavedRecipient, 'id' | 'sendCount'>[]; invalidEntries: string[] } {
  const valid: Omit<SavedRecipient, 'id' | 'sendCount'>[] = [];
  const invalidEntries: string[] = [];

  const lines = rawInput
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Skip CSV header row if present
    if (/^(email|ho_ten|name)\b/i.test(line) && line.includes(',')) {
      continue;
    }

    // Check angle bracket pattern: "Name <email@domain.com>"
    const bracketMatch = line.match(/^([^<]+)<([^>]+)>$/);
    if (bracketMatch) {
      const name = bracketMatch[1].trim();
      const email = bracketMatch[2].trim().toLowerCase();
      if (isValidEmail(email)) {
        valid.push({
          name: name || deriveNameFromEmail(email),
          email,
          group: defaultGroup,
          selected: true,
        });
      } else {
        invalidEntries.push(line);
      }
      continue;
    }

    // Check CSV row: "Name, email, Company, Voucher" or "email, Name, Company"
    const parts = line.split(/[,|\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2 && !isValidEmail(parts[0]) && isValidEmail(parts[1])) {
      const email = parts[1].toLowerCase();
      valid.push({
        name: parts[0],
        email,
        company: parts[2] || undefined,
        voucherCode: parts[3] || undefined,
        group: defaultGroup,
        selected: true,
      });
      continue;
    }
    if (parts.length >= 2 && isValidEmail(parts[0]) && !isValidEmail(parts[1])) {
      const email = parts[0].toLowerCase();
      valid.push({
        name: parts[1],
        email,
        company: parts[2] || undefined,
        voucherCode: parts[3] || undefined,
        group: defaultGroup,
        selected: true,
      });
      continue;
    }

    // Otherwise treat comma-separated tokens as individual emails
    for (const token of parts) {
      const cleanEmail = token.toLowerCase();
      if (isValidEmail(cleanEmail)) {
        valid.push({
          name: deriveNameFromEmail(cleanEmail),
          email: cleanEmail,
          group: defaultGroup,
          selected: true,
        });
      } else {
        invalidEntries.push(token);
      }
    }
  }

  return { valid, invalidEntries };
}

export function deriveNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Khách hàng';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Personalize email subject or HTML/text body with recipient fields
 * Replaces {{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}, {{Ma_Uu_Dai}}, {{name}}, {{email}}, {{company}}, {{ho_ten}}, {{cong_ty}}, {{ma_voucher}}
 */
export function personalizeContent(
  content: string,
  recipient: Pick<SavedRecipient, 'name' | 'email' | 'company' | 'voucherCode'>,
  defaultDiscountCode: string = 'AUTUMN40'
): string {
  if (!content) return '';
  const displayName = recipient.name?.trim() || deriveNameFromEmail(recipient.email);
  const companyName = recipient.company?.trim() || 'Quý công ty';
  const voucher = recipient.voucherCode?.trim() || defaultDiscountCode || 'AUTUMN40';

  let output = content
    .replace(/\{\{\s*Ten_Khach_Hang\s*\}\}/gi, displayName)
    .replace(/\{\{\s*ho_ten\s*\}\}/gi, displayName)
    .replace(/\{\{\s*name\s*\}\}/gi, displayName)
    .replace(/\{\{\s*Ten_Cong_Ty\s*\}\}/gi, companyName)
    .replace(/\{\{\s*cong_ty\s*\}\}/gi, companyName)
    .replace(/\{\{\s*company\s*\}\}/gi, companyName)
    .replace(/\{\{\s*Ma_Uu_Dai\s*\}\}/gi, voucher)
    .replace(/\{\{\s*ma_voucher\s*\}\}/gi, voucher)
    .replace(/\{\{\s*email\s*\}\}/gi, recipient.email);

  // Also personalize generic greetings if no explicit name merge tag was present
  if (
    !content.includes('{{name}}') &&
    !content.includes('{{Ten_Khach_Hang}}') &&
    !content.includes('{{ho_ten}}') &&
    displayName
  ) {
    output = output.replace(/Chào bạn thân mến/g, `Chào ${displayName} thân mến`);
    output = output.replace(/Chào quý khách hàng thân thiết/g, `Chào ${displayName} (${companyName})`);
    output = output.replace(/Chào bạn,/g, `Chào ${displayName},`);
  }

  return output;
}

/**
 * Generate 3 concrete AI-recommended send time slots from the current SendTimeTip
 */
export function buildRecommendedTimeSlots(
  sendTimeTip: SendTimeTip | null,
  nowMs: number = Date.now()
): RecommendedTimeSlot[] {
  const baseDate = new Date(nowMs);

  // Slot 1: AI Primary Golden Hour (e.g. Today or Tomorrow at 19:30)
  const slot1Date = new Date(nowMs);
  slot1Date.setHours(19, 30, 0, 0);
  if (slot1Date.getTime() <= nowMs + 5 * 60 * 1000) {
    slot1Date.setDate(slot1Date.getDate() + 1);
  }

  // Slot 2: Morning Executive Check-in (Tomorrow 09:15)
  const slot2Date = new Date(nowMs);
  slot2Date.setDate(baseDate.getDate() + 1);
  slot2Date.setHours(9, 15, 0, 0);

  // Slot 3: Peak Weekend / Thursday-Friday Slot (2 days ahead at 20:00)
  const slot3Date = new Date(nowMs);
  slot3Date.setDate(baseDate.getDate() + 2);
  slot3Date.setHours(20, 0, 0, 0);

  return [
    {
      id: 'slot-ai-primary',
      label: `Khung giờ Vàng AI đề xuất (${sendTimeTip?.bestDays || 'Thứ Năm & Thứ Sáu'})`,
      dayLabel: sendTimeTip?.bestDays || 'Thứ Năm & Thứ Sáu',
      timeRange: sendTimeTip?.bestHours || '19:30 - 21:00',
      scheduledAtIso: sendTimeTip?.suggestedDateTimeIso || slot1Date.toISOString(),
      openRateBoost: '+32% tỉ lệ mở',
      reason:
        sendTimeTip?.explanation ||
        'Khung giờ người nhận kiểm tra hộp thư cá nhân và có tỉ lệ nhấp chuột mua sắm cao nhất.',
    },
    {
      id: 'slot-morning-peak',
      label: 'Khung giờ Sáng Công sở (09:15 - 10:30)',
      dayLabel: 'Sáng ngày mai',
      timeRange: '09:15 - 10:30',
      scheduledAtIso: slot2Date.toISOString(),
      openRateBoost: '+24% tỉ lệ mở',
      reason: 'Thời điểm bắt đầu ngày làm việc, phù hợp với khách hàng văn phòng và đối tác B2B.',
    },
    {
      id: 'slot-demo-fast',
      label: 'Khung giờ Tự động Gửi Nhanh (Sau 15 giây để kiểm thử)',
      dayLabel: 'Hôm nay (Tự động chạy sau 15 giây)',
      timeRange: 'Sau 15 giây',
      scheduledAtIso: new Date(nowMs + 15 * 1000).toISOString(),
      openRateBoost: 'Kích hoạt tức thì',
      reason: 'Dùng để kiểm chứng trực tiếp tính năng tự động gửi hàng loạt khi đồng hồ đếm ngược về 0.',
    },
  ];
}

/**
 * Check which scheduled plans are due for auto-sending at `nowMs`
 */
export function getDueScheduledPlans(
  plans: ScheduledEmailPlan[],
  nowMs: number = Date.now()
): ScheduledEmailPlan[] {
  return plans.filter((plan) => {
    if (plan.status !== 'scheduled' || !plan.autoSendEnabled) return false;
    const scheduledMs = new Date(plan.scheduledAtIso).getTime();
    if (Number.isNaN(scheduledMs)) return false;
    return scheduledMs <= nowMs;
  });
}

/**
 * Format remaining time into human-readable Vietnamese countdown string
 */
export function formatCountdownVi(scheduledAtIso: string, nowMs: number = Date.now()): string {
  const targetMs = new Date(scheduledAtIso).getTime();
  if (Number.isNaN(targetMs)) return 'Không xác định';

  const diffSec = Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
  if (diffSec === 0) return 'Đang kích hoạt gửi...';

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (days > 0) {
    return `Còn ${days} ngày ${hours}h ${minutes}p`;
  }
  if (hours > 0) {
    return `Còn ${hours}h ${minutes}p ${seconds}s`;
  }
  if (minutes > 0) {
    return `Còn ${minutes} phút ${seconds} giây`;
  }
  return `Còn ${seconds} giây`;
}
