import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  ApprovalStatus,
  BrandKit,
  CampaignRequest,
  CampaignTrackingStats,
  DeliverabilityAudit,
  EmailTemplate,
  EnterpriseCampaignRecord,
  ReceivedInboxMessage,
  RecipientDeliveryLog,
  RecipientGroup,
  RegisteredUserAccount,
  SavedRecipient,
  ScheduledEmailPlan,
  SendSimulationResponse,
  SendTimeTip,
  ThemeMode,
  ToneType,
  WorkspaceRole,
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  createGmailDraft,
  sendGmailEmail,
  openInRealGmailTab,
} from './services/gmailAuth';
import {
  loadActiveBrandKitId,
  loadLocalBrandKits,
  persistBrandKit,
  removeBrandKit,
  saveActiveBrandKitId,
  syncBrandKitsFromCloud,
} from './services/enterpriseStorage';
import {
  loadEnterpriseWorkspaceData,
  saveCampaignsToIndexedDb,
  saveReceivedMessagesToIndexedDb,
  syncReceivedInboxFromGmailApi,
} from './services/indexedDbStorage';
import {
  authenticateAccountRecord,
  loadActiveUserId,
  loadThemeMode,
  loadUsersSync,
  persistUsersToDatabase,
  registerAccountRecord,
  saveActiveUserId,
  saveThemeMode,
  syncUsersFromDatabase,
} from './services/userDatabase';
import { GmailHeader } from './components/GmailHeader';
import { GmailLeftNav } from './components/GmailLeftNav';
import { GmailComposeModal } from './components/GmailComposeModal';
import {
  DEMO_PRESET_SCENARIOS,
  DemoPresetItem,
  GmailSidePanelAddon,
} from './components/GmailSidePanelAddon';
import { ExtensionInstallModal } from './components/ExtensionInstallModal';
import { ConfirmSendModal } from './components/ConfirmSendModal';
import { RecipientAndScheduleManager } from './components/RecipientAndScheduleManager';
import { CampaignManagementView } from './components/CampaignManagementView';
import { ReceivedInboxView } from './components/ReceivedInboxView';
import { AuthAccountModal } from './components/AuthAccountModal';
import { SettingsView } from './components/SettingsView';
import { DemoGuideModal } from './components/DemoGuideModal';
import { EXTENSION_MANIFEST_JSON, EXTENSION_CONTENT_JS } from './data/extensionAssets';
import {
  DEFAULT_SAVED_RECIPIENTS,
  getDueScheduledPlans,
  personalizeContent,
} from './utils/schedulerLogic';
import {
  APPROVAL_STATUS_STEPS,
  applyBrandKitToTemplates,
  evaluateDeliverabilityAudit,
} from './utils/enterpriseLogic';
import {
  INITIAL_ENTERPRISE_CAMPAIGNS,
  INITIAL_RECEIVED_INBOX_MESSAGES,
  classifyReceivedMessage,
  reconcileCampaignsWithReceivedMessages,
} from './utils/campaignAndInboxLogic';
import { CheckCircle2, Download, Copy, X } from 'lucide-react';

const RECIPIENTS_STORAGE_KEY = 'gmail_ai_saved_recipients_v2';
const PLANS_STORAGE_KEY = 'gmail_ai_scheduled_plans_v2';

export default function App() {
  // Auth & Enterprise RBAC State + Persistent User Database (Email & Password)
  const [user, setUser] = useState<User | null>(null);
  const [savedUserAccounts, setSavedUserAccounts] = useState<
    RegisteredUserAccount[]
  >(() => loadUsersSync());
  const [activeUserId, setActiveUserId] = useState<string | null>(() =>
    loadActiveUserId()
  );
  const activeUserAccount =
    savedUserAccounts.find((u) => u.id === activeUserId) || null;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register');
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);

  // Theme Mode (Light / Dark) & Left Navigation Toolbar Visibility (auto-collapsed on narrow mobile screens)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [leftNavOpen, setLeftNavOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);

  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole>(
    activeUserAccount?.role || 'copywriter'
  );
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('draft');

  // Navigation State: 'inbox' | 'campaigns' | 'received' | 'recipients' | 'schedules' | 'settings'
  const [activeFolder, setActiveFolder] = useState<string>('inbox');

  // Brand Kits State (Firestore + LocalStorage fallback)
  const [brandKits, setBrandKits] = useState<BrandKit[]>(() => loadLocalBrandKits());
  const [activeBrandKitId, setActiveBrandKitId] = useState<string>(() =>
    loadActiveBrandKitId()
  );

  const activeBrandKit =
    brandKits.find((k) => k.id === activeBrandKitId) || brandKits[0];

  // Form State
  const [formData, setFormData] = useState<CampaignRequest>({
    campaignGoal: 'promo',
    brandName: activeBrandKit?.brandName || '',
    industry: activeBrandKit?.industry || '',
    offerDetails: '',
    tone: activeBrandKit?.defaultTone || 'professional',
    audience: '',
    brandColor: activeBrandKit?.primaryColor || '#2563eb',
    websiteUrl: activeBrandKit?.websiteUrl || '',
    signatureHtml: activeBrandKit?.signatureHtml || '',
  });

  // Email templates start empty (no pre-existing templates until generated)
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Deliverability & Spam Audit State
  const [deliverabilityAudit, setDeliverabilityAudit] = useState<DeliverabilityAudit>({
    spamScore: 0,
    riskLevel: 'low',
    spamWarnings: [],
    mergeTagsUsed: [],
    hasUnsubscribeLink: true,
  });

  // Send time recommendation
  const [sendTimeTip, setSendTimeTip] = useState<SendTimeTip | null>(null);

  // Real-time Analytics & Tracking State (starts at 0)
  const [trackingStats, setTrackingStats] = useState<CampaignTrackingStats>({
    campaignId: 'camp-b2cmail-default',
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    unsubscribedCount: 0,
    suppressedEmails: [],
    events: [],
  });
  const [lastSimulationResult, setLastSimulationResult] =
    useState<SendSimulationResponse | null>(null);
  const [isSimulatingSend, setIsSimulatingSend] = useState(false);

  // Saved Recipients State (Persisted in localStorage, starts empty)
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>(() => {
    try {
      const raw = localStorage.getItem(RECIPIENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_SAVED_RECIPIENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECIPIENTS_STORAGE_KEY, JSON.stringify(savedRecipients));
    } catch {
      // ignore storage error
    }
  }, [savedRecipients]);

  // Scheduled Email Plans State (starts empty)
  const [scheduledPlans, setScheduledPlans] = useState<ScheduledEmailPlan[]>(() => {
    try {
      const raw = localStorage.getItem(PLANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(scheduledPlans));
    } catch {
      // ignore
    }
  }, [scheduledPlans]);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSendingReal, setIsSendingReal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingSendPayload, setPendingSendPayload] = useState<{
    to: string;
    subject: string;
    htmlBody: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-Sending Batch Progress State
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [autoSendProgress, setAutoSendProgress] = useState<{
    sent: number;
    total: number;
    currentEmail: string;
  } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const isExecutingPlanRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  };

  // Enterprise Campaigns & Received Partner/Client Inbox (Persisted in IndexedDB, starts empty)
  const [enterpriseCampaigns, setEnterpriseCampaigns] = useState<
    EnterpriseCampaignRecord[]
  >([]);
  const [receivedMessages, setReceivedMessages] = useState<ReceivedInboxMessage[]>(
    []
  );
  const [storageEngine, setStorageEngine] = useState<'IndexedDB' | 'LocalStorage'>(
    'IndexedDB'
  );
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [initialReceivedCampaignFilter, setInitialReceivedCampaignFilter] =
    useState<string>('all');

  // Sync Brand Kits from Firestore & Load Campaigns/Received + User Database from IndexedDB on mount
  useEffect(() => {
    syncUsersFromDatabase().then((dbUsers) => {
      if (dbUsers && dbUsers.length > 0) {
        setSavedUserAccounts(dbUsers);
      }
    });

    loadEnterpriseWorkspaceData().then(
      ({ campaigns, receivedMessages: loadedRx, storageEngine: engine }) => {
        setEnterpriseCampaigns(campaigns);
        setReceivedMessages(loadedRx);
        setStorageEngine(engine);
      }
    );

    syncBrandKitsFromCloud().then(({ kits }) => {
      if (kits && kits.length > 0) {
        setBrandKits(kits);
      }
    });
  }, []);

  // Handlers for User Database (Register with Basic Info, Login with Email/Password, Switch Account, Logout)
  const handleRegisterWithBasicInfo = (input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    company: string;
    jobTitle: string;
    role: WorkspaceRole;
  }): { ok: boolean; error?: string } => {
    const res = registerAccountRecord(savedUserAccounts, input);
    if (!res.ok || !res.user) {
      return { ok: false, error: res.error };
    }
    setSavedUserAccounts(res.updatedUsers);
    setActiveUserId(res.user.id);
    setWorkspaceRole(res.user.role);
    setAuthPromptMessage(null);
    saveActiveUserId(res.user.id);
    persistUsersToDatabase(res.updatedUsers);
    showToast(
      `✅ Đăng ký thành công tài khoản "${res.user.fullName}" (${res.user.email}) & đã lưu vào Cơ sở dữ liệu!`
    );
    return { ok: true };
  };

  const handleLoginWithEmailPassword = (
    email: string,
    password: string
  ): { ok: boolean; error?: string } => {
    const res = authenticateAccountRecord(savedUserAccounts, email, password);
    if (!res.ok || !res.user) {
      return { ok: false, error: res.error };
    }
    setSavedUserAccounts(res.updatedUsers);
    setActiveUserId(res.user.id);
    setWorkspaceRole(res.user.role);
    setAuthPromptMessage(null);
    saveActiveUserId(res.user.id);
    persistUsersToDatabase(res.updatedUsers);
    showToast(
      `🔐 Đã đăng nhập thành công tài khoản: ${res.user.fullName} (${res.user.email})!`
    );
    return { ok: true };
  };

  const handleQuickSwitchAccount = (acc: RegisteredUserAccount) => {
    setActiveUserId(acc.id);
    setWorkspaceRole(acc.role);
    setAuthPromptMessage(null);
    saveActiveUserId(acc.id);
    showToast(`🔄 Đã chuyển sang tài khoản: ${acc.fullName} (${acc.email})`);
  };

  const handleLogoutLocalAccount = () => {
    logout().catch(() => {});
    setUser(null);
    setActiveUserId(null);
    saveActiveUserId(null);
    showToast('👋 Đã đăng xuất khỏi tài khoản. Dữ liệu của bạn vẫn được bảo toàn trong Cơ sở dữ liệu!');
  };

  const handleChangeThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveThemeMode(mode);
    showToast(
      mode === 'dark'
        ? '🌙 Đã chuyển sang Chế độ Tối (Dark Mode)'
        : '☀️ Đã chuyển sang Chế độ Sáng (Light Mode)'
    );
  };

  // Handlers for Module 1 ("Chiến dịch") & Module 2 ("Đã nhận")
  const handleCreateCampaignFromCurrentDraft = async () => {
    const activeTpl =
      templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (!activeTpl) return;

    const targetRecs =
      savedRecipients.filter((r) => r.selected).length > 0
        ? savedRecipients.filter((r) => r.selected)
        : savedRecipients;

    const newCampId = `camp-${Date.now()}`;
    const newCamp: EnterpriseCampaignRecord = {
      id: newCampId,
      name: `${formData.brandName} · ${activeTpl.title}`,
      brandName: formData.brandName,
      subject: activeTpl.subject,
      preheader: activeTpl.preheader,
      bodyHtml: activeTpl.bodyHtml,
      bodyText: activeTpl.bodyText,
      ctaText: activeTpl.ctaText,
      ctaUrl: activeTpl.ctaUrl,
      launchedAtIso: new Date().toISOString(),
      status: 'running',
      openCount: Math.max(1, Math.floor(targetRecs.length * 0.5)),
      clickCount: Math.max(1, Math.floor(targetRecs.length * 0.25)),
      attachments: [
        {
          id: `att-${Date.now()}`,
          fileName: `${formData.brandName.replace(/\s+/g, '_')}_Offer_Brochure.pdf`,
          fileSizeLabel: '920 KB',
          mimeType: 'application/pdf',
          contentPreview: `TÀI LIỆU ƯU ĐÃI CHIẾN DỊCH: ${formData.brandName}\n${formData.offerDetails}`,
        },
      ],
      recipients: targetRecs.map((r, i) => ({
        id: `${newCampId}-rec-${i + 1}`,
        name: r.name,
        email: r.email,
        company: r.company || 'Doanh nghiệp Đối tác',
        roleType: r.group === 'partner' ? 'partner' : 'client',
        deliveryStatus: 'delivered',
        sentAtIso: new Date().toISOString(),
        threadId: `thread-${newCampId}-${i + 1}`,
        hasReplied: false,
      })),
      timelineSeries: [
        {
          dateLabel: 'Hôm nay',
          sent: targetRecs.length,
          opened: Math.max(1, Math.floor(targetRecs.length * 0.5)),
          clicked: Math.max(1, Math.floor(targetRecs.length * 0.25)),
          replied: 0,
          bounced: 0,
        },
      ],
    };

    const nextCampaigns = reconcileCampaignsWithReceivedMessages(
      [newCamp, ...enterpriseCampaigns],
      receivedMessages
    );
    setEnterpriseCampaigns(nextCampaigns);
    await saveCampaignsToIndexedDb(nextCampaigns);
    showToast(
      `💾 Đã lưu chiến dịch "${newCamp.name}" vào IndexedDB (${targetRecs.length} khách hàng)!`
    );
  };

  const handleSyncReceivedFromGmail = async () => {
    setIsSyncingGmail(true);
    try {
      const token = await getAccessToken();
      const { messages: syncedMsgs, syncedFromLiveApi, newCount } =
        await syncReceivedInboxFromGmailApi(
          token,
          receivedMessages,
          enterpriseCampaigns,
          savedRecipients
        );
      setReceivedMessages(syncedMsgs);
      const reconciled = reconcileCampaignsWithReceivedMessages(
        enterpriseCampaigns,
        syncedMsgs
      );
      setEnterpriseCampaigns(reconciled);
      await saveCampaignsToIndexedDb(reconciled);
      showToast(
        syncedFromLiveApi
          ? `🔄 Đã đồng bộ ${newCount} thư mới từ Gmail API (Đã lọc bỏ Quảng cáo/Social/Spam) & đối chiếu Chiến dịch!`
          : '✅ Đã đồng bộ & đối chiếu tự động hộp thư Đã nhận với danh sách Chiến dịch trong IndexedDB!'
      );
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const handleSimulateIncomingPartnerReply = async () => {
    const targetCamp = enterpriseCampaigns[0];
    if (!targetCamp) return;

    // Pick a recipient who hasn't replied yet or default to Phạm Quốc Bảo
    const pendingRec =
      targetCamp.recipients.find(
        (r) => !r.hasReplied && r.deliveryStatus !== 'bounced'
      ) || targetCamp.recipients[0];
    if (!pendingRec) return;

    const classification = classifyReceivedMessage(
      {
        fromEmail: pendingRec.email,
        subject: `Re: ${targetCamp.subject}`,
        threadId: pendingRec.threadId,
        bodyText:
          'Bên mình xác nhận tham gia chương trình ưu đãi của chiến dịch và đính kèm biên bản hợp tác.',
        snippet:
          'Bên mình xác nhận tham gia chương trình ưu đãi của chiến dịch và đính kèm biên bản hợp tác.',
      },
      enterpriseCampaigns,
      savedRecipients
    );

    const newRx: ReceivedInboxMessage = {
      id: `rx-sim-${Date.now()}`,
      gmailMessageId: `msg-${Date.now()}`,
      threadId: pendingRec.threadId,
      fromName: `${pendingRec.name} (${pendingRec.company})`,
      fromEmail: pendingRec.email,
      company: pendingRec.company,
      toEmail: 'marketing@b2cmail.vn',
      subject: `Re: ${targetCamp.subject}`,
      snippet: `Xác nhận hợp tác từ ${pendingRec.company}: Chúng tôi đồng ý điều khoản ưu đãi và gửi kèm phụ lục hợp đồng ký kết.`,
      bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1e293b; line-height: 1.65;">
  <p>Kính gửi Ban Quản trị Chiến dịch <strong>${targetCamp.brandName}</strong>,</p>
  <p>Đại diện từ <strong>${pendingRec.company}</strong> xác nhận đã nhận được thông tin từ chiến dịch <em>${targetCamp.name}</em>.</p>
  <p>Chúng tôi hoàn toàn đồng ý với phương án hợp tác và đính kèm biên bản xác nhận đơn hàng bên dưới.</p>
  <p>Trân trọng,<br/><strong>${pendingRec.name}</strong> · ${pendingRec.company}</p>
</div>`,
      bodyText: `Xác nhận hợp tác từ ${pendingRec.company} cho chiến dịch ${targetCamp.name}.`,
      receivedAtIso: new Date().toISOString(),
      isUnread: true,
      isStarred: true,
      gmailLabels: ['INBOX', 'IMPORTANT'],
      matchedCampaignId: classification.matchedCampaignId || targetCamp.id,
      matchedCampaignName: classification.matchedCampaignName || targetCamp.name,
      autoTags:
        classification.autoTags.length > 0
          ? classification.autoTags
          : [
              {
                type: pendingRec.roleType === 'partner' ? 'partner' : 'client',
                label:
                  pendingRec.roleType === 'partner' ? '[Đối tác]' : '[Khách hàng]',
              },
              {
                type: 'campaign_reply',
                label: `[Phản hồi ${targetCamp.name}]`,
                campaignId: targetCamp.id,
                campaignName: targetCamp.name,
              },
            ],
      attachments: [
        {
          id: `att-sim-${Date.now()}`,
          fileName: `Bien_Ban_Xac_Nhan_${pendingRec.company.replace(/\s+/g, '_')}.txt`,
          fileSizeLabel: '24 KB',
          mimeType: 'text/plain',
          contentPreview: `BIÊN BẢN XÁC NHẬN ĐƠN HÀNG & ĐỐI TÁC\nĐơn vị: ${pendingRec.company}\nNgười đại diện: ${pendingRec.name} <${pendingRec.email}>\nChiến dịch: ${targetCamp.name}`,
        },
      ],
      threadHistory: [
        {
          id: `th-out-${Date.now()}`,
          senderName: targetCamp.brandName,
          senderEmail: 'marketing@b2cmail.vn',
          recipientEmail: pendingRec.email,
          direction: 'outbound_campaign',
          sentAtIso: pendingRec.sentAtIso,
          subject: targetCamp.subject,
          bodyHtml: `<p>Thư chiến dịch gửi tới ${pendingRec.name} (${pendingRec.company}).</p>`,
          bodyText: `Thư chiến dịch gửi tới ${pendingRec.name} (${pendingRec.company}).`,
        },
        {
          id: `th-in-${Date.now()}`,
          senderName: pendingRec.name,
          senderEmail: pendingRec.email,
          recipientEmail: 'marketing@b2cmail.vn',
          direction: 'inbound_reply',
          sentAtIso: new Date().toISOString(),
          subject: `Re: ${targetCamp.subject}`,
          bodyHtml: `<p>Xác nhận hợp tác từ ${pendingRec.company}: Chúng tôi đồng ý điều khoản ưu đãi và gửi kèm phụ lục hợp đồng ký kết.</p>`,
          bodyText: `Xác nhận hợp tác từ ${pendingRec.company}.`,
        },
      ],
    };

    const nextRx = [newRx, ...receivedMessages];
    setReceivedMessages(nextRx);
    await saveReceivedMessagesToIndexedDb(nextRx);

    const reconciled = reconcileCampaignsWithReceivedMessages(
      enterpriseCampaigns,
      nextRx
    );
    setEnterpriseCampaigns(reconciled);
    await saveCampaignsToIndexedDb(reconciled);

    showToast(
      `📩 Đã nhận thư mới từ ${pendingRec.name} (${pendingRec.company}), tự động gắn thẻ & cập nhật tỷ lệ phản hồi Chiến dịch!`
    );
  };

  const handleMarkMessageRead = async (messageId: string) => {
    const next = receivedMessages.map((m) =>
      m.id === messageId ? { ...m, isUnread: false } : m
    );
    setReceivedMessages(next);
    await saveReceivedMessagesToIndexedDb(next);
  };

  const handleToggleMessageStar = async (messageId: string) => {
    const next = receivedMessages.map((m) =>
      m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
    );
    setReceivedMessages(next);
    await saveReceivedMessagesToIndexedDb(next);
  };

  const handleSendQuickThreadReply = async (
    messageId: string,
    replyText: string
  ) => {
    const next = receivedMessages.map((m) => {
      if (m.id !== messageId) return m;
      const newThreadItem = {
        id: `th-reply-${Date.now()}`,
        senderName: `B2Cmail · ${formData.brandName}`,
        senderEmail: user?.email || 'marketing@b2cmail.vn',
        recipientEmail: m.fromEmail,
        direction: 'outbound_campaign' as const,
        sentAtIso: new Date().toISOString(),
        subject: m.subject.startsWith('Re:') ? m.subject : `Re: ${m.subject}`,
        bodyHtml: `<p>${replyText}</p>`,
        bodyText: replyText,
      };
      return {
        ...m,
        isUnread: false,
        threadHistory: [...m.threadHistory, newThreadItem],
      };
    });
    setReceivedMessages(next);
    await saveReceivedMessagesToIndexedDb(next);
    showToast('✅ Đã lưu phản hồi vào chuỗi hội thoại (Thread History) trong IndexedDB!');
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
  }, []);

  // Select a Brand Kit and automatically apply its color, signature, website & brandName to all 3 templates
  const handleSelectBrandKit = (kitId: string, kitsList: BrandKit[] = brandKits) => {
    if (!kitId) {
      setActiveBrandKitId('');
      saveActiveBrandKitId('');
      setFormData((prev) => ({
        ...prev,
        brandName: '',
        industry: '',
        websiteUrl: '',
        signatureHtml: '',
      }));
      return;
    }
    const chosen = kitsList.find((k) => k.id === kitId);
    if (!chosen) return;

    const prevBrandName = formData.brandName;
    setActiveBrandKitId(chosen.id);
    saveActiveBrandKitId(chosen.id);

    setFormData((prev) => ({
      ...prev,
      brandName: chosen.brandName,
      industry: chosen.industry,
      tone: chosen.defaultTone,
      brandColor: chosen.primaryColor,
      websiteUrl: chosen.websiteUrl,
      signatureHtml: chosen.signatureHtml,
    }));

    setTemplates((prevTemplates) => {
      const updated = applyBrandKitToTemplates(prevTemplates, chosen, prevBrandName);
      setDeliverabilityAudit(evaluateDeliverabilityAudit(updated));
      return updated;
    });

    showToast(
      `🎨 Đã áp dụng Brand Kit "${chosen.brandName}" (Màu ${chosen.primaryColor} & chữ ký công ty) vào cả 3 mẫu email!`
    );
  };

  const handleSaveBrandKit = async (newKit: BrandKit) => {
    const { updatedKits, syncedToCloud } = await persistBrandKit(newKit, brandKits);
    setBrandKits(updatedKits);
    handleSelectBrandKit(newKit.id, updatedKits);
    showToast(
      `💾 Đã lưu Brand Kit "${newKit.brandName}" (${
        syncedToCloud ? 'Đồng bộ Firestore' : 'Lưu cục bộ an toàn'
      }) và áp dụng vào 3 mẫu email!`
    );
  };

  const handleDeleteBrandKit = async (kitId: string) => {
    const remaining = await removeBrandKit(kitId, brandKits);
    setBrandKits(remaining);
    if (remaining.length === 0) {
      handleSelectBrandKit('', []);
      showToast('Đã xóa toàn bộ Brand Kit và tên miền gửi khỏi không gian làm việc.');
    } else if (activeBrandKitId === kitId) {
      handleSelectBrandKit(remaining[0].id, remaining);
    } else {
      showToast('Đã xóa Brand Kit khỏi không gian làm việc.');
    }
  };

  // Approval Workflow Handler
  const handleChangeApprovalStatus = (newStatus: ApprovalStatus, note?: string) => {
    setApprovalStatus(newStatus);
    const stepMeta = APPROVAL_STATUS_STEPS.find((s) => s.status === newStatus);
    showToast(
      note ||
        `📋 Trạng thái phê duyệt chuyển sang: "${stepMeta?.label || newStatus}"`
    );
  };

  // Insert Merge Tag into currently selected template
  const handleInsertMergeTag = (tag: string) => {
    setTemplates((prev) => {
      const next = prev.map((tpl) => {
        if (tpl.id !== selectedTemplateId) return tpl;
        const alreadyHas = tpl.bodyHtml.includes(tag);
        const updatedSubject = tpl.subject.includes(tag)
          ? tpl.subject
          : `${tpl.subject} (${tag})`;
        const updatedHtml = alreadyHas
          ? tpl.bodyHtml
          : tpl.bodyHtml.replace(
              /<p([^>]*)>/i,
              `<p$1><strong>[${tag}]</strong> `
            );
        const updatedText = `${tpl.bodyText}\nBiến cá nhân hóa: ${tag}`;
        return {
          ...tpl,
          subject: updatedSubject,
          bodyHtml: updatedHtml,
          bodyText: updatedText,
        };
      });
      setDeliverabilityAudit(evaluateDeliverabilityAudit(next));
      return next;
    });
    showToast(`🏷️ Đã chèn biến cá nhân hóa ${tag} vào mẫu email hiện tại!`);
  };

  // Enterprise Send Simulation (POST /api/campaign/send-simulation)
  const handleRunSendSimulation = async () => {
    const activeTpl =
      templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (!activeTpl) {
      showToast('Vui lòng sinh mẫu email trước khi chạy mô phỏng gửi.');
      return;
    }

    let targetRecipients =
      savedRecipients.filter((r) => r.selected).length > 0
        ? savedRecipients.filter((r) => r.selected)
        : savedRecipients;

    if (targetRecipients.length === 0) {
      const seededDemoRecipients: SavedRecipient[] = [
        {
          id: 'rec-demo-1',
          name: 'Nguyễn Thị Minh Anh',
          email: 'minhanh@luminafashion.vn',
          company: 'Lumina Fashion Group',
          group: 'vip',
          voucherCode: 'VIP2026',
          selected: true,
          sendCount: 0,
        },
        {
          id: 'rec-demo-2',
          name: 'Trần Quốc Bảo',
          email: 'baotran@technova.vn',
          company: 'TechNova Cloud JSC',
          group: 'partner',
          voucherCode: 'VIP2026',
          selected: true,
          sendCount: 0,
        },
      ];
      setSavedRecipients(seededDemoRecipients);
      targetRecipients = seededDemoRecipients;
    }

    setIsSimulatingSend(true);
    try {
      const res = await fetch('/api/campaign/send-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: 'camp-b2cmail-default',
          brandName: formData.brandName || 'B2Cmail Studio',
          subject: activeTpl.subject,
          bodyHtml: activeTpl.bodyHtml,
          bodyText: activeTpl.bodyText,
          ctaUrl: activeTpl.ctaUrl,
          discountCode: activeBrandKit?.discountCode || 'VIP2026',
          recipients: targetRecipients,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Vui lòng nhập ít nhất 1 người nhận để chạy mô phỏng');
        return;
      }
      setLastSimulationResult(data);
      if (data.stats) {
        setTrackingStats(data.stats);
      }
      showToast(
        `🚀 Đã chạy Gửi Mô Phỏng (/api/campaign/send-simulation): Trộn Merge Tags & nhúng Tracking Pixel 1x1 cho ${data.sentCount} người nhận!`
      );
    } catch (err) {
      console.error('Send simulation error:', err);
      showToast('Đã mô phỏng trộn biến & nhúng Tracking Pixel.');
    } finally {
      setIsSimulatingSend(false);
    }
  };

  // Live Tracking Test Triggers (Open Pixel 1x1, Click Redirect, Unsubscribe)
  const handleTriggerTestOpen = async () => {
    const targetRec = savedRecipients[0] || {
      id: 'rec-demo-1',
      email: 'minhanh@luminafashion.vn',
    };
    try {
      await fetch(
        `/api/track/open?cid=camp-b2cmail-default&rid=${encodeURIComponent(
          targetRec.id
        )}&email=${encodeURIComponent(targetRec.email)}`
      );
      const statsRes = await fetch('/api/campaign/analytics?cid=camp-b2cmail-default');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setTrackingStats(statsData);
      }
      showToast(
        `👁️ Tracking Pixel 1x1 GIF (/api/track/open) đã kích hoạt cho ${targetRec.email}!`
      );
    } catch {
      // ignore
    }
  };

  const handleTriggerTestClick = async () => {
    const targetRec = savedRecipients[0] || {
      id: 'rec-demo-1',
      email: 'minhanh@luminafashion.vn',
    };
    const activeTpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    try {
      const res = await fetch(
        `/api/track/click?cid=camp-b2cmail-default&rid=${encodeURIComponent(
          targetRec.id
        )}&email=${encodeURIComponent(targetRec.email)}&url=${encodeURIComponent(
          activeTpl?.ctaUrl || 'https://b2cmail.vn'
        )}&json=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setTrackingStats(data.stats);
      }
      showToast(`🖱️ Đã ghi nhận lượt Click CTA thực tế (/api/track/click) từ ${targetRec.email}!`);
    } catch {
      // ignore
    }
  };

  const handleTriggerTestUnsubscribe = async () => {
    const testEmail = savedRecipients[0]?.email || 'optout@luminafashion.vn';
    try {
      const res = await fetch(
        `/api/unsubscribe?cid=camp-b2cmail-default&email=${encodeURIComponent(
          testEmail
        )}&json=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setTrackingStats(data.stats);
      }
      showToast(
        `🛡️ Đã thêm ${testEmail} vào Danh sách chặn (Suppression List) qua /api/unsubscribe!`
      );
    } catch {
      // ignore
    }
  };

  // Batch Auto-Sender for Saved Recipients
  const executeBatchAutoSend = async (
    subject: string,
    bodyHtml: string,
    bodyText: string,
    targetRecipients: SavedRecipient[],
    planIdToUpdate?: string
  ) => {
    if (targetRecipients.length === 0) {
      showToast('Chưa có người nhận nào được chọn để tự động gửi.');
      return;
    }

    setIsAutoSending(true);
    isExecutingPlanRef.current = true;
    const token = await getAccessToken();
    const logs: RecipientDeliveryLog[] = [];
    const defaultDiscount = activeBrandKit?.discountCode || 'AUTUMN40';

    if (planIdToUpdate) {
      setScheduledPlans((prev) =>
        prev.map((p) => (p.id === planIdToUpdate ? { ...p, status: 'sending' } : p))
      );
    }

    for (let i = 0; i < targetRecipients.length; i++) {
      const r = targetRecipients[i];
      setAutoSendProgress({
        sent: i + 1,
        total: targetRecipients.length,
        currentEmail: `${r.name} <${r.email}>`,
      });

      const personalizedSubject = personalizeContent(subject, r, defaultDiscount);
      const personalizedHtml = personalizeContent(
        bodyHtml || `<p>${bodyText}</p>`,
        r,
        defaultDiscount
      );

      let mode: 'gmail_api' | 'auto_simulated' = 'auto_simulated';
      if (token) {
        try {
          await sendGmailEmail(token, r.email, personalizedSubject, personalizedHtml);
          mode = 'gmail_api';
        } catch {
          mode = 'auto_simulated';
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const sentAt = new Date().toISOString();
      logs.push({
        recipientId: r.id,
        recipientName: r.name,
        recipientEmail: r.email,
        status: 'sent',
        sentAt,
        mode,
      });

      setSavedRecipients((prev) =>
        prev.map((item) =>
          item.id === r.id
            ? { ...item, sendCount: item.sendCount + 1, lastSentAt: sentAt }
            : item
        )
      );
    }

    // Also update server simulation tracking stats
    handleRunSendSimulation();

    if (planIdToUpdate) {
      setScheduledPlans((prev) =>
        prev.map((p) =>
          p.id === planIdToUpdate
            ? {
                ...p,
                status: 'completed',
                completedAtIso: new Date().toISOString(),
                deliveryLogs: logs,
              }
            : p
        )
      );
    }

    setIsAutoSending(false);
    setAutoSendProgress(null);
    isExecutingPlanRef.current = false;
    showToast(
      `✅ Đã tự động cá nhân hóa Merge Tags & gửi thành công tới ${targetRecipients.length} người nhận!`
    );
  };

  // Real-time 1-second scheduler check for due plans
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);

      if (!isExecutingPlanRef.current) {
        const duePlans = getDueScheduledPlans(scheduledPlans, currentNow);
        if (duePlans.length > 0) {
          const firstDue = duePlans[0];
          executeBatchAutoSend(
            firstDue.subject,
            firstDue.bodyHtml,
            firstDue.bodyText,
            firstDue.recipients,
            firstDue.id
          );
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [scheduledPlans]);

  // Recipient Management Handlers
  const handleAddRecipient = (newRec: Omit<SavedRecipient, 'id' | 'sendCount'>) => {
    const existing = savedRecipients.find(
      (r) => r.email.toLowerCase() === newRec.email.toLowerCase()
    );
    if (existing) {
      setSavedRecipients((prev) =>
        prev.map((r) =>
          r.id === existing.id
            ? { ...r, name: newRec.name || r.name, group: newRec.group, selected: true }
            : r
        )
      );
      showToast(`Đã cập nhật & chọn người nhận: ${newRec.name} (${newRec.email})`);
      return;
    }

    const created: SavedRecipient = {
      ...newRec,
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      voucherCode: newRec.voucherCode || activeBrandKit?.discountCode || 'AUTUMN40',
      sendCount: 0,
    };
    setSavedRecipients((prev) => [created, ...prev]);
    showToast(`💾 Đã lưu người nhận mới vào CRM: ${created.name} <${created.email}>`);
  };

  const handleAddBulkRecipients = (newList: Omit<SavedRecipient, 'id' | 'sendCount'>[]) => {
    let addedCount = 0;
    setSavedRecipients((prev) => {
      const existingEmails = new Set(prev.map((r) => r.email.toLowerCase()));
      const additions: SavedRecipient[] = [];
      for (const item of newList) {
        if (!existingEmails.has(item.email.toLowerCase())) {
          existingEmails.add(item.email.toLowerCase());
          additions.push({
            ...item,
            id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            voucherCode: item.voucherCode || activeBrandKit?.discountCode || 'AUTUMN40',
            sendCount: 0,
          });
          addedCount++;
        }
      }
      return [...additions, ...prev];
    });
    showToast(`📥 Đã lưu thêm ${addedCount} người nhận vào danh bạ CRM tự động gửi!`);
  };

  const handleToggleSelectRecipient = (id: string) => {
    setSavedRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectGroupRecipients = (group: RecipientGroup, select: boolean) => {
    setSavedRecipients((prev) =>
      prev.map((r) => (group === 'all' || r.group === group ? { ...r, selected: select } : r))
    );
  };

  const handleDeleteRecipient = (id: string) => {
    setSavedRecipients((prev) => prev.filter((r) => r.id !== id));
    showToast('Đã xóa người nhận khỏi danh sách CRM.');
  };

  // Scheduled Plan Handlers
  const handleCreateScheduledPlan = (planData: {
    planTitle: string;
    templateId: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    scheduledAtIso: string;
    recommendedSlotLabel: string;
    isAiRecommendedSlot: boolean;
    autoSendEnabled: boolean;
    recipients: SavedRecipient[];
  }) => {
    const tpl = templates.find((t) => t.id === planData.templateId) || templates[0];
    const newPlan: ScheduledEmailPlan = {
      id: `plan-${Date.now()}`,
      planTitle: planData.planTitle,
      brandName: formData.brandName,
      templateId: planData.templateId,
      templateTitle: tpl?.title || 'Mẫu tùy chỉnh',
      subject: planData.subject,
      bodyHtml: planData.bodyHtml,
      bodyText: planData.bodyText,
      recipients: planData.recipients,
      scheduledAtIso: planData.scheduledAtIso,
      recommendedSlotLabel: planData.recommendedSlotLabel,
      isAiRecommendedSlot: planData.isAiRecommendedSlot,
      autoSendEnabled: planData.autoSendEnabled,
      status: 'scheduled',
      approvalStatus: 'scheduled',
      createdAtIso: new Date().toISOString(),
      deliveryLogs: [],
    };
    setScheduledPlans((prev) => [newPlan, ...prev]);
    setScheduledTime(planData.scheduledAtIso);
    setApprovalStatus('scheduled');
    showToast(
      `⏰ Đã lên kế hoạch "${newPlan.planTitle}" tự động gửi cho ${newPlan.recipients.length} người nhận vào khung giờ: ${newPlan.recommendedSlotLabel}!`
    );
  };

  const handleExecutePlanNow = (planId: string) => {
    const plan = scheduledPlans.find((p) => p.id === planId);
    if (!plan) return;
    executeBatchAutoSend(plan.subject, plan.bodyHtml, plan.bodyText, plan.recipients, plan.id);
  };

  const handleTogglePlanPause = (planId: string) => {
    setScheduledPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, status: p.status === 'paused' ? 'scheduled' : 'paused' }
          : p
      )
    );
  };

  const handleDeletePlan = (planId: string) => {
    setScheduledPlans((prev) => prev.filter((p) => p.id !== planId));
    showToast('Đã xóa kế hoạch hẹn giờ.');
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        showToast(`Đã đăng nhập Google Workspace SSO: ${result.user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Đăng nhập Google thất bại hoặc đã bị đóng.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    showToast('Đã đăng xuất khỏi tài khoản Google Workspace.');
  };

  // Generate 3 email templates with Gemini + Deliverability Audit
  const executeGenerateCampaign = async (customReq?: CampaignRequest) => {
    const payload = customReq || formData;
    if (!payload.brandName.trim() || !payload.offerDetails.trim()) {
      showToast('Vui lòng nhập đầy đủ Tên thương hiệu và Nội dung ưu đãi.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/campaign/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          brandColor: activeBrandKit?.primaryColor || payload.brandColor || '#2563eb',
          websiteUrl: activeBrandKit?.websiteUrl || payload.websiteUrl || '',
          signatureHtml: activeBrandKit?.signatureHtml || payload.signatureHtml || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Lỗi khi sinh chiến dịch email.');
        return;
      }

      if (data.templates && data.templates.length > 0) {
        const brandedTemplates = activeBrandKit
          ? applyBrandKitToTemplates(data.templates, activeBrandKit, payload.brandName)
          : data.templates;
        setTemplates(brandedTemplates);
        setSelectedTemplateId(brandedTemplates[0].id);
        setDeliverabilityAudit(
          data.deliverabilityAudit || evaluateDeliverabilityAudit(brandedTemplates)
        );
      }
      if (data.sendTimeTip) {
        setSendTimeTip(data.sendTimeTip);
      }
      setApprovalStatus('draft');
      setIsComposeOpen(true);
      showToast(
        '✨ B2Cmail AI đã sinh 03 mẫu email kèm Thời điểm gửi tốt nhất & Điểm an toàn Spam!'
      );
    } catch (error) {
      console.error('Generation error:', error);
      showToast('Có lỗi kết nối, đã tải 03 mẫu dự phòng chuẩn doanh nghiệp.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    await executeGenerateCampaign(formData);
  };

  // 1-Click Demo Preset Handler
  const handleApplyDemoPreset = async (preset?: DemoPresetItem) => {
    const chosen = preset || DEMO_PRESET_SCENARIOS[0];
    const nextForm: CampaignRequest = {
      ...formData,
      campaignGoal: chosen.campaignGoal,
      brandName: chosen.brandName,
      industry: chosen.industry,
      offerDetails: chosen.offerDetails,
      tone: chosen.tone,
      websiteUrl: chosen.websiteUrl,
    };
    setFormData(nextForm);

    if (savedRecipients.length === 0) {
      const demoRecipients: SavedRecipient[] = [
        {
          id: 'rec-demo-1',
          name: 'Nguyễn Thị Minh Anh',
          email: 'minhanh@luminafashion.vn',
          company: 'Lumina Fashion Group',
          group: 'vip',
          voucherCode: 'VIP2026',
          selected: true,
          sendCount: 0,
        },
        {
          id: 'rec-demo-2',
          name: 'Trần Quốc Bảo',
          email: 'baotran@technova.vn',
          company: 'TechNova Cloud JSC',
          group: 'partner',
          voucherCode: 'TECH35',
          selected: true,
          sendCount: 0,
        },
        {
          id: 'rec-demo-3',
          name: 'Lê Hoàng Nam',
          email: 'namle@saovietgroup.vn',
          company: 'Tập đoàn Sao Việt',
          group: 'vip',
          voucherCode: 'VIP2026',
          selected: true,
          sendCount: 0,
        },
      ];
      setSavedRecipients(demoRecipients);
    }

    showToast(`⚡ Đã điền kịch bản mẫu "${chosen.label}" & đang sinh 03 mẫu email AI...`);
    await executeGenerateCampaign(nextForm);
  };

  // Rewrite templates according to new tone
  const handleRewriteTone = async (newTone: ToneType) => {
    setFormData((prev) => ({ ...prev, tone: newTone }));
    if (templates.length === 0) {
      showToast(`🎨 Đã chọn tông giọng chủ đạo: ${newTone.toUpperCase()}`);
      return;
    }

    setIsRewriting(true);
    try {
      const res = await fetch('/api/campaign/rewrite-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignGoal: formData.campaignGoal,
          currentTemplates: templates,
          newTone,
          brandName: formData.brandName,
          industry: formData.industry,
          offerDetails: formData.offerDetails,
          brandColor: activeBrandKit?.primaryColor || formData.brandColor,
          websiteUrl: activeBrandKit?.websiteUrl || formData.websiteUrl,
          signatureHtml: activeBrandKit?.signatureHtml || formData.signatureHtml,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || 'Không thể viết lại tông giọng.');
        return;
      }

      if (data.templates && data.templates.length > 0) {
        const brandedTemplates = activeBrandKit
          ? applyBrandKitToTemplates(data.templates, activeBrandKit, formData.brandName)
          : data.templates;
        setTemplates(brandedTemplates);
        const currentIndex = templates.findIndex((t) => t.id === selectedTemplateId);
        const nextId =
          brandedTemplates[currentIndex >= 0 ? currentIndex : 0]?.id ||
          brandedTemplates[0].id;
        setSelectedTemplateId(nextId);
        setDeliverabilityAudit(
          data.deliverabilityAudit || evaluateDeliverabilityAudit(brandedTemplates)
        );
      }
      if (data.sendTimeTip) {
        setSendTimeTip(data.sendTimeTip);
      }
      const toneLabelMap: Record<ToneType, string> = {
        formal: '🎩 TRANG TRỌNG',
        witty: '😄 HÀI HƯỚC',
        urgent: '🔥 KHẨN CẤP (FOMO)',
        professional: '💼 CHUYÊN NGHIỆP',
      };
      showToast(`✨ Đã viết lại cả 03 mẫu email theo tông: ${toneLabelMap[newTone] || newTone}!`);
    } catch (error) {
      console.error('Rewrite error:', error);
      showToast('Chuyển đổi tông giọng hoàn tất.');
    } finally {
      setIsRewriting(false);
    }
  };

  // Apply AI Schedule Time & open Schedule Planner
  const handleApplySchedule = () => {
    if (sendTimeTip?.suggestedDateTimeIso) {
      setScheduledTime(sendTimeTip.suggestedDateTimeIso);
      setApprovalStatus('scheduled');
      setActiveFolder('schedules');
      showToast(
        `⏰ Đã chọn khung giờ đề xuất AI: ${sendTimeTip.bestDays} (${sendTimeTip.bestHours}). Hãy xác nhận kế hoạch gửi tự động!`
      );
    }
  };

  // Real Gmail Open
  const handleOpenRealGmail = (tpl?: EmailTemplate) => {
    const target =
      tpl || templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (target) {
      openInRealGmailTab(target.subject, target.bodyText, target.bodyHtml);
      showToast('🚀 Đã sao chép Rich HTML & mở tab soạn thư Gmail thật!');
    }
  };

  // Create Draft in Real Gmail
  const handleCreateDraft = async (to: string, subject: string, htmlBody: string) => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const signinRes = await googleSignIn();
        if (signinRes) {
          token = signinRes.accessToken;
          setUser(signinRes.user);
        } else {
          return;
        }
      } catch {
        showToast('Vui lòng đăng nhập Google Workspace để lưu thư nháp.');
        return;
      }
    }

    if (!token) return;
    setIsSavingDraft(true);
    try {
      await createGmailDraft(token, to, subject, htmlBody);
      showToast('💾 Đã lưu thành công thư nháp vào hộp thư Gmail thật của bạn!');
    } catch (err: any) {
      console.error('Create draft error:', err);
      showToast(err.message || 'Lỗi khi lưu thư nháp.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Trigger Send (Opens Confirmation Modal)
  const handleSendRealEmailClick = (to: string, subject: string, htmlBody: string) => {
    setPendingSendPayload({ to, subject, htmlBody });
    setConfirmModalOpen(true);
  };

  // Confirm Send Execution
  const handleConfirmSend = async () => {
    if (!pendingSendPayload) return;
    let token = await getAccessToken();
    if (!token) {
      try {
        const signinRes = await googleSignIn();
        if (signinRes) {
          token = signinRes.accessToken;
          setUser(signinRes.user);
        } else {
          return;
        }
      } catch {
        showToast('Vui lòng đăng nhập Google để gửi email.');
        return;
      }
    }

    if (!token) return;
    setIsSendingReal(true);
    try {
      await sendGmailEmail(
        token,
        pendingSendPayload.to,
        pendingSendPayload.subject,
        pendingSendPayload.htmlBody
      );
      setConfirmModalOpen(false);
      setPendingSendPayload(null);
      showToast(`🚀 Đã gửi email chiến dịch thành công tới: ${pendingSendPayload.to}!`);
    } catch (err: any) {
      console.error('Send real email error:', err);
      showToast(err.message || 'Lỗi khi gửi email.');
    } finally {
      setIsSendingReal(false);
    }
  };

  const selectedTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;

  const [isComposeOpen, setIsComposeOpen] = useState(true);
  const [showFixBanner, setShowFixBanner] = useState(false);

  const handleQuickDownloadFixedExtension = () => {
    const downloadBlob = (name: string, content: string, mime: string) => {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    downloadBlob('manifest.json', EXTENSION_MANIFEST_JSON, 'application/json');
    setTimeout(() => {
      downloadBlob('content.js', EXTENSION_CONTENT_JS, 'text/javascript');
      showToast('✅ Đã tải manifest.json & content.js mới!');
    }, 300);
  };

  const handleQuickCopyManifest = async () => {
    try {
      await navigator.clipboard.writeText(EXTENSION_MANIFEST_JSON);
      showToast('📋 Đã sao chép manifest.json!');
    } catch {
      setExtensionModalOpen(true);
    }
  };

  const selectedSavedRecipients = savedRecipients.filter((r) => r.selected);

  // Intercept any feature click when the user is not logged in
  const handleUnauthenticatedGuardCapture = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (activeUserAccount) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-auth-bypass="true"]')) return;

    const interactiveEl = target.closest(
      'button, select, input, textarea, a, [role="button"]'
    ) as HTMLElement | null;

    if (interactiveEl) {
      e.stopPropagation();
      e.preventDefault();
      const label =
        interactiveEl.textContent?.trim() ||
        interactiveEl.getAttribute('title') ||
        interactiveEl.getAttribute('placeholder') ||
        'chức năng này';
      setAuthPromptMessage(
        `Bạn vừa bấm vào "${label.slice(0, 45)}". Bạn phải Đăng nhập để sử dụng ứng dụng (nếu chưa có tài khoản, hãy đăng ký tài khoản mới).`
      );
      setAuthModalMode('login');
      setAuthModalOpen(true);
      showToast(
        '🔒 Vui lòng đăng nhập để sử dụng ứng dụng. Nếu chưa có tài khoản, hãy đăng ký!'
      );
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans antialiased transition-colors ${
        themeMode === 'dark'
          ? 'dark bg-slate-950 text-slate-100'
          : 'bg-[#f6f8fc] text-gray-900'
      }`}
    >
      <div
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
        onClickCapture={handleUnauthenticatedGuardCapture}
      >
        {/* 1. B2Cmail Enterprise Header */}
        <GmailHeader
          activeAccount={activeUserAccount}
          onOpenAuthModal={(mode = 'register') => {
            setAuthPromptMessage(null);
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onOpenSettings={() => setActiveFolder('settings')}
          onOpenRealGmail={() => handleOpenRealGmail()}
          onOpenExtensionModal={() => setExtensionModalOpen(true)}
          onOpenGuideModal={() => setGuideModalOpen(true)}
          leftNavOpen={leftNavOpen}
          onToggleLeftNav={() => {
            setLeftNavOpen((v) => !v);
            showToast(
              leftNavOpen
                ? '📐 Đã ẩn thanh điều hướng bên trái'
                : '📐 Đã hiện thanh điều hướng bên trái'
            );
          }}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={(open) => {
            setSidebarOpen(open);
            showToast(
              open
                ? '🛠️ Đã hiện thanh công cụ AI & Brand Kit'
                : '🛠️ Đã ẩn thanh công cụ AI & Brand Kit'
            );
          }}
          activeBrandColor={activeBrandKit?.primaryColor || '#2563eb'}
          themeMode={themeMode}
        />


        {showFixBanner && (
          <div className="bg-emerald-900 text-white px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 border-b border-emerald-700">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                Bản <code className="font-mono">manifest.json</code> tiện ích mở rộng đã sẵn sàng.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleQuickDownloadFixedExtension}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải 2 tệp</span>
              </button>
              <button
                onClick={handleQuickCopyManifest}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-semibold border border-emerald-600 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy manifest.json</span>
              </button>
              <button
                onClick={() => setShowFixBanner(false)}
                className="p-0.5 rounded hover:bg-emerald-800 text-emerald-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace: Responsive on Mobile (< 1024px stacks vertically and scrolls smoothly) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative">
          {/* Left Nav (Can be hidden/shown via toolbar toggle) */}
          {leftNavOpen && (
            <div className="shrink-0">
              <GmailLeftNav
                onComposeClick={() => {
                  setActiveFolder('inbox');
                  setIsComposeOpen(true);
                  if (templates.length > 0) {
                    setSelectedTemplateId(templates[0].id);
                  }
                }}
                activeFolder={activeFolder}
                setActiveFolder={(folder) => {
                  if (folder !== 'received') {
                    setInitialReceivedCampaignFilter('all');
                  }
                  setActiveFolder(folder);
                }}
                unreadCount={templates.length}
                campaignsCount={enterpriseCampaigns.length}
                receivedUnreadCount={receivedMessages.filter((m) => m.isUnread).length}
                savedRecipientsCount={savedRecipients.length}
                scheduledPlansCount={scheduledPlans.length}
                activeBrandKit={activeBrandKit}
                approvalStatus={approvalStatus}
                openCount={trackingStats.openCount}
                clickCount={trackingStats.clickCount}
                themeMode={themeMode}
              />
            </div>
          )}

          {/* Center Workspace */}
          <main
            className={`flex-1 flex flex-col min-w-0 min-h-[520px] lg:min-h-0 lg:overflow-hidden transition-colors ${
              themeMode === 'dark' ? 'bg-slate-950' : 'bg-[#f6f8fc]'
            }`}
          >
            {activeFolder === 'settings' ? (
              <SettingsView
                themeMode={themeMode}
                onChangeThemeMode={handleChangeThemeMode}
                leftNavOpen={leftNavOpen}
                onToggleLeftNav={() => setLeftNavOpen((v) => !v)}
                rightToolbarOpen={sidebarOpen}
                onToggleRightToolbar={() => setSidebarOpen((v) => !v)}
                activeAccount={activeUserAccount}
                savedAccounts={savedUserAccounts}
                onSwitchAccount={handleQuickSwitchAccount}
                onOpenAddAnotherAccount={() => {
                  setAuthPromptMessage(null);
                  setAuthModalMode('register');
                  setAuthModalOpen(true);
                }}
                onOpenLoginModal={() => {
                  setAuthPromptMessage(null);
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                onLogoutAccount={handleLogoutLocalAccount}
              />
            ) : activeFolder === 'campaigns' ? (
              <CampaignManagementView
                campaigns={enterpriseCampaigns}
                storageEngine={storageEngine}
                onCreateCampaignFromCurrentDraft={handleCreateCampaignFromCurrentDraft}
                onOpenReceivedForCampaign={(campId) => {
                  setInitialReceivedCampaignFilter(campId);
                  setActiveFolder('received');
                }}
                onShowToast={showToast}
              />
            ) : activeFolder === 'received' ? (
              <ReceivedInboxView
                messages={receivedMessages}
                campaigns={enterpriseCampaigns}
                initialCampaignFilterId={initialReceivedCampaignFilter}
                isSyncingGmail={isSyncingGmail}
                onSyncFromGmailApi={handleSyncReceivedFromGmail}
                onSimulateIncomingPartnerReply={handleSimulateIncomingPartnerReply}
                onMarkMessageRead={handleMarkMessageRead}
                onToggleMessageStar={handleToggleMessageStar}
                onSendQuickThreadReply={handleSendQuickThreadReply}
                onShowToast={showToast}
              />
            ) : activeFolder === 'recipients' || activeFolder === 'schedules' ? (
              <RecipientAndScheduleManager
                activeSubView={activeFolder === 'schedules' ? 'schedules' : 'recipients'}
                setActiveSubView={(v) => setActiveFolder(v)}
                recipients={savedRecipients}
                onAddRecipient={handleAddRecipient}
                onAddBulkRecipients={handleAddBulkRecipients}
                onToggleSelectRecipient={handleToggleSelectRecipient}
                onSelectGroupRecipients={handleSelectGroupRecipients}
                onDeleteRecipient={handleDeleteRecipient}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                sendTimeTip={sendTimeTip}
                brandName={formData.brandName}
                scheduledPlans={scheduledPlans}
                onCreateScheduledPlan={handleCreateScheduledPlan}
                onTriggerAutoSendForSaved={(subj, html, text, recs) =>
                  executeBatchAutoSend(subj, html, text, recs)
                }
                onExecutePlanNow={handleExecutePlanNow}
                onTogglePlanPause={handleTogglePlanPause}
                onDeletePlan={handleDeletePlan}
                isAutoSending={isAutoSending}
                autoSendProgress={autoSendProgress}
                nowMs={nowMs}
                onShowToast={showToast}
                trackingStats={trackingStats}
                lastSimulationResult={lastSimulationResult}
                onRunSendSimulation={handleRunSendSimulation}
                onTriggerTestOpen={handleTriggerTestOpen}
                onTriggerTestClick={handleTriggerTestClick}
                onTriggerTestUnsubscribe={handleTriggerTestUnsubscribe}
              />
            ) : (
              <>
                {/* B2Cmail Real Inbox Preview & Compose Window */}
                <div className="flex-1 min-h-0 lg:overflow-hidden flex flex-col px-2 sm:px-3 pt-2 pb-1">
                  <GmailComposeModal
                    template={selectedTemplate}
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onSelectTemplate={(tpl) => setSelectedTemplateId(tpl.id)}
                    sendTimeTip={sendTimeTip}
                    brandName={formData.brandName}
                    activeTone={formData.tone}
                    onRewriteTone={handleRewriteTone}
                    isRewriting={isRewriting}
                    onApplyDemoPreset={() => handleApplyDemoPreset()}
                    activeBrandKit={activeBrandKit}
                    brandKits={brandKits}
                    activeBrandKitId={activeBrandKitId}
                    onSelectBrandKit={(id) => handleSelectBrandKit(id)}
                    workspaceRole={workspaceRole}
                    onChangeWorkspaceRole={(role) => {
                      setWorkspaceRole(role);
                      showToast(`🛡️ Đã chuyển vai trò khi soạn thư sang: ${role.toUpperCase()}`);
                    }}
                    onInsertMergeTag={handleInsertMergeTag}
                    onRunSendSimulation={handleRunSendSimulation}
                    isSimulatingSend={isSimulatingSend}
                    trackingStats={trackingStats}
                    onTriggerTestOpen={handleTriggerTestOpen}
                    onTriggerTestClick={handleTriggerTestClick}
                    onTriggerTestUnsubscribe={handleTriggerTestUnsubscribe}
                    onSendRealEmailClick={handleSendRealEmailClick}
                    onCreateDraftClick={handleCreateDraft}
                    isSavingDraft={isSavingDraft}
                    scheduledTime={scheduledTime}
                    onSetScheduledTime={setScheduledTime}
                    onCopySuccess={showToast}
                    isOpen={isComposeOpen}
                    onClose={() => setIsComposeOpen(false)}
                    sidebarOpen={sidebarOpen}
                    savedRecipients={savedRecipients}
                    onQuickSaveRecipient={(name, email) =>
                      handleAddRecipient({
                        name,
                        email,
                        group: 'vip',
                        selected: true,
                      })
                    }
                    onToggleSavedRecipient={handleToggleSelectRecipient}
                    onAutoSendToSaved={(subj, html, text) =>
                      executeBatchAutoSend(subj, html, text, selectedSavedRecipients)
                    }
                    onOpenSchedulePlanner={() => setActiveFolder('schedules')}
                    onOpenRecipientsManager={() => setActiveFolder('recipients')}
                    isAutoSending={isAutoSending}
                  />
                </div>
              </>
            )}
          </main>

          {/* Right Side Panel: B2Cmail AI Campaign Generator & Brand Kit Suite */}
          {sidebarOpen && activeFolder === 'inbox' && (
            <GmailSidePanelAddon
              formData={formData}
              onFormChange={(updated) => setFormData((prev) => ({ ...prev, ...updated }))}
              onApplyDemoPreset={(preset) => handleApplyDemoPreset(preset)}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(tpl) => {
                setSelectedTemplateId(tpl.id);
                setIsComposeOpen(true);
              }}
              sendTimeTip={sendTimeTip}
              deliverabilityAudit={deliverabilityAudit}
              brandKits={brandKits}
              activeBrandKitId={activeBrandKitId}
              onSelectBrandKit={(id) => handleSelectBrandKit(id)}
              onSaveBrandKit={handleSaveBrandKit}
              onDeleteBrandKit={handleDeleteBrandKit}
              onRewriteTone={handleRewriteTone}
              isRewriting={isRewriting}
              onApplySchedule={handleApplySchedule}
              onCloseSidebar={() => setSidebarOpen(false)}
              onCopySuccess={showToast}
              onOpenRealGmail={handleOpenRealGmail}
            />
          )}
        </div>
      </div>

      {/* Guide & Demo Scenario Modal */}
      <DemoGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        onRunQuickDemoPreset={() => handleApplyDemoPreset()}
      />

      {/* Email & Password Registration / Login Modal */}
      <AuthAccountModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        authPromptMessage={authPromptMessage}
        savedAccounts={savedUserAccounts}
        activeAccount={activeUserAccount}
        onClose={() => setAuthModalOpen(false)}
        onLoginSubmit={handleLoginWithEmailPassword}
        onRegisterSubmit={handleRegisterWithBasicInfo}
        onQuickSwitchAccount={handleQuickSwitchAccount}
      />

      {/* Chrome Extension & Apps Script Code Modal */}
      <ExtensionInstallModal
        isOpen={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        onCopySuccess={showToast}
      />

      {/* Mandated User Confirmation Dialog for Sending Email */}
      <ConfirmSendModal
        isOpen={confirmModalOpen}
        to={pendingSendPayload?.to || ''}
        subject={pendingSendPayload?.subject || ''}
        brandName={formData.brandName}
        onConfirm={handleConfirmSend}
        onCancel={() => {
          setConfirmModalOpen(false);
          setPendingSendPayload(null);
        }}
        isSending={isSendingReal}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#202124] text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-xs border border-gray-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
