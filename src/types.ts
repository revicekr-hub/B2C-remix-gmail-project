export type CampaignGoal = 'launch' | 'promo' | 'care';

export type ToneType = 'formal' | 'witty' | 'urgent' | 'professional';

export interface EmailTemplate {
  id: string;
  title: string;
  angle: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  estimatedOpenRate: string;
  estimatedCTR: string;
  keyHighlight: string;
}

export interface SendTimeTip {
  bestDays: string;
  bestHours: string;
  explanation: string;
  suggestedDateTimeIso: string;
  industryInsights: string;
}

export interface DeliverabilityAudit {
  spamScore: number;
  riskLevel?: 'low' | 'medium' | 'high';
  spamWarnings: string[];
  mergeTagsUsed: string[];
  hasUnsubscribeLink?: boolean;
}

export interface BrandKit {
  id: string;
  brandName: string;
  industry: string;
  defaultTone: ToneType;
  primaryColor: string;
  signatureHtml: string;
  websiteUrl: string;
  discountCode?: string;
}

export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled';

export type WorkspaceRole = 'copywriter' | 'approver' | 'admin';

export interface CampaignRequest {
  campaignGoal: CampaignGoal;
  brandName: string;
  industry: string;
  offerDetails: string;
  tone: ToneType;
  audience?: string;
  targetDiscount?: string;
  brandColor?: string;
  websiteUrl?: string;
  signatureHtml?: string;
}

export interface CampaignResponse {
  templates: EmailTemplate[];
  sendTimeTip: SendTimeTip;
  deliverabilityAudit: DeliverabilityAudit;
}

export interface SimulatedInboxMail {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  time: string;
  isUnread: boolean;
  isStarred?: boolean;
  isAiGenerated?: boolean;
  templateIndex?: number;
}

export type RecipientGroup = 'vip' | 'new_lead' | 'partner' | 'loyal' | 'all';

export interface SavedRecipient {
  id: string;
  name: string;
  email: string;
  group: RecipientGroup;
  company?: string;
  voucherCode?: string;
  selected: boolean;
  lastSentAt?: string;
  sendCount: number;
}

export type ScheduledPlanStatus = 'scheduled' | 'sending' | 'completed' | 'paused';

export interface RecipientDeliveryLog {
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  mode: 'gmail_api' | 'auto_simulated';
}

export interface ScheduledEmailPlan {
  id: string;
  planTitle: string;
  brandName: string;
  templateId: string;
  templateTitle: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  recipients: SavedRecipient[];
  scheduledAtIso: string;
  recommendedSlotLabel: string;
  isAiRecommendedSlot: boolean;
  autoSendEnabled: boolean;
  status: ScheduledPlanStatus;
  approvalStatus?: ApprovalStatus;
  createdAtIso: string;
  completedAtIso?: string;
  deliveryLogs: RecipientDeliveryLog[];
}

export interface RecommendedTimeSlot {
  id: string;
  label: string;
  dayLabel: string;
  timeRange: string;
  scheduledAtIso: string;
  openRateBoost: string;
  reason: string;
}

export interface TrackingEventLog {
  id: string;
  campaignId: string;
  recipientId?: string;
  email: string;
  type: 'send' | 'open' | 'click' | 'unsubscribe';
  timestamp: string;
  detail?: string;
}

export interface CampaignTrackingStats {
  campaignId: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  unsubscribedCount: number;
  totalSuppressedCount?: number;
  suppressedEmails: string[];
  events: TrackingEventLog[];
}

export interface SimulatedDeliveryItem {
  recipientId: string;
  name: string;
  email: string;
  company: string;
  voucherCode: string;
  mergedSubject: string;
  mergedHtml: string;
  trackingPixelUrl: string;
  clickTrackUrl: string;
  unsubscribeUrl: string;
  status: 'sent' | 'suppressed';
}

export interface SendSimulationResponse {
  campaignId: string;
  sentCount: number;
  skippedSuppressedCount: number;
  trackingPixelTemplate: string;
  unsubscribeUrlTemplate: string;
  deliveries: SimulatedDeliveryItem[];
  stats: CampaignTrackingStats;
}

// ============================================================================
// MODULE 1: PHÂN HỆ "CHIẾN DỊCH" (CAMPAIGN MANAGEMENT & ANALYTICS)
// ============================================================================

export type CampaignLifecycleStatus = 'completed' | 'running' | 'draft';

export type CampaignLeadClassification = 'client' | 'partner' | 'vip';

export type CampaignRecipientDeliveryState = 'delivered' | 'bounced' | 'sending' | 'pending';

export interface CampaignAttachmentItem {
  id: string;
  fileName: string;
  fileSizeLabel: string;
  mimeType: string;
  contentPreview: string;
}

export interface CampaignRecipientRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  roleType: CampaignLeadClassification;
  deliveryStatus: CampaignRecipientDeliveryState;
  sentAtIso: string;
  threadId: string;
  hasReplied: boolean;
  repliedAtIso?: string;
  replySnippet?: string;
  bounceReason?: string;
}

export interface CampaignTimelinePoint {
  dateLabel: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}

export interface EnterpriseCampaignRecord {
  id: string;
  name: string;
  brandName: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  launchedAtIso: string;
  status: CampaignLifecycleStatus;
  recipients: CampaignRecipientRecord[];
  attachments: CampaignAttachmentItem[];
  timelineSeries: CampaignTimelinePoint[];
  openCount: number;
  clickCount: number;
}

export interface CampaignComputedKpis {
  totalSent: number;
  deliveredCount: number;
  bouncedCount: number;
  repliedCount: number;
  replyRatePercent: number;
  deliveryRatePercent: number;
  bounceRatePercent: number;
}

export type ExportFormatType = 'csv' | 'xlsx' | 'pdf' | 'json';

// ============================================================================
// MODULE 2: PHÂN HỆ "ĐÃ NHẬN" (RECEIVED - PARTNER & CLIENT INBOX)
// ============================================================================

export type ReceivedMessageTagType = 'client' | 'partner' | 'campaign_reply' | 'bounce_daemon';

export interface ReceivedMessageTag {
  type: ReceivedMessageTagType;
  label: string;
  campaignId?: string;
  campaignName?: string;
}

export interface ThreadConversationItem {
  id: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  direction: 'outbound_campaign' | 'inbound_reply';
  sentAtIso: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface ReceivedInboxMessage {
  id: string;
  gmailMessageId: string;
  threadId: string;
  fromName: string;
  fromEmail: string;
  company?: string;
  toEmail: string;
  subject: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  receivedAtIso: string;
  isUnread: boolean;
  isStarred: boolean;
  gmailLabels: string[];
  matchedCampaignId?: string;
  matchedCampaignName?: string;
  autoTags: ReceivedMessageTag[];
  attachments: CampaignAttachmentItem[];
  threadHistory: ThreadConversationItem[];
}

export type ReceivedQuickFilter =
  | 'all'
  | 'unread'
  | 'from_client'
  | 'from_partner'
  | 'has_attachment';

// ============================================================================
// MODULE 3: CƠ SỞ DỮ LIỆU NGƯỜI DÙNG & CÀI ĐẶT HỆ THỐNG (USER DB & SETTINGS)
// ============================================================================

export type ThemeMode = 'light' | 'dark';

export interface RegisteredUserAccount {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  company: string;
  jobTitle: string;
  role: WorkspaceRole;
  createdAtIso: string;
  lastLoginAtIso: string;
}



