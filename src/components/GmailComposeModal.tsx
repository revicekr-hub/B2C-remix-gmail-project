import React, { useState } from 'react';
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  Send,
  Clock,
  Trash2,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  Code,
  FileCheck,
  ChevronUp,
  UserPlus,
  Users,
  CalendarClock,
  RotateCw,
  Tag,
  Palette,
  ShieldCheck,
  Activity,
  Monitor,
  Smartphone,
  Star,
  Square,
  Wand2,
  TrendingUp,
} from 'lucide-react';
import {
  BrandKit,
  CampaignTrackingStats,
  EmailTemplate,
  SavedRecipient,
  SendTimeTip,
  ToneType,
  WorkspaceRole,
} from '../types';
import {
  deriveNameFromEmail,
  isValidEmail,
  personalizeContent,
} from '../utils/schedulerLogic';
import {
  MERGE_TAG_CATALOG,
  WORKSPACE_ROLE_LABELS,
} from '../utils/enterpriseLogic';

interface GmailComposeModalProps {
  template: EmailTemplate | null;
  templates: EmailTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: EmailTemplate) => void;
  sendTimeTip: SendTimeTip | null;
  brandName: string;
  activeTone: ToneType;
  onRewriteTone: (tone: ToneType) => void;
  isRewriting: boolean;
  onApplyDemoPreset: () => void;
  activeBrandKit?: BrandKit;
  brandKits: BrandKit[];
  activeBrandKitId: string;
  onSelectBrandKit: (kitId: string) => void;
  workspaceRole: WorkspaceRole;
  onChangeWorkspaceRole: (role: WorkspaceRole) => void;
  onInsertMergeTag: (tag: string) => void;
  onRunSendSimulation: () => void;
  isSimulatingSend?: boolean;
  trackingStats?: CampaignTrackingStats;
  onTriggerTestOpen?: () => void;
  onTriggerTestClick?: () => void;
  onTriggerTestUnsubscribe?: () => void;
  onSendRealEmailClick: (to: string, subject: string, htmlBody: string) => void;
  onCreateDraftClick: (to: string, subject: string, htmlBody: string) => void;
  isSavingDraft: boolean;
  scheduledTime: string | null;
  onSetScheduledTime: (timeIso: string | null) => void;
  onCopySuccess: (msg: string) => void;
  isOpen: boolean;
  onClose: () => void;
  sidebarOpen: boolean;
  savedRecipients: SavedRecipient[];
  onQuickSaveRecipient: (name: string, email: string) => void;
  onToggleSavedRecipient: (id: string) => void;
  onAutoSendToSaved: (subject: string, htmlBody: string, textBody: string) => void;
  onOpenSchedulePlanner: () => void;
  onOpenRecipientsManager: () => void;
  isAutoSending?: boolean;
}

export const GmailComposeModal: React.FC<GmailComposeModalProps> = ({
  template,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  sendTimeTip,
  brandName,
  activeTone,
  onRewriteTone,
  isRewriting,
  onApplyDemoPreset,
  activeBrandKit,
  brandKits,
  activeBrandKitId,
  onSelectBrandKit,
  workspaceRole,
  onChangeWorkspaceRole,
  onInsertMergeTag,
  onRunSendSimulation,
  isSimulatingSend = false,
  trackingStats,
  onTriggerTestOpen,
  onTriggerTestClick,
  onTriggerTestUnsubscribe,
  onSendRealEmailClick,
  onCreateDraftClick,
  isSavingDraft,
  onSetScheduledTime,
  onCopySuccess,
  isOpen,
  onClose,
  sidebarOpen,
  savedRecipients,
  onQuickSaveRecipient,
  onAutoSendToSaved,
  onOpenSchedulePlanner,
  onOpenRecipientsManager,
  isAutoSending = false,
}) => {
  const [recipient, setRecipient] = useState('');
  const [recipientNameInput, setRecipientNameInput] = useState('');
  const [customSubject, setCustomSubject] = useState(template?.subject || '');
  const [customBodyText, setCustomBodyText] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'html'>('desktop');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [copiedMode, setCopiedMode] = useState<'full' | 'subject' | 'html' | null>(null);

  // Merge Tag Live Customer Preview State ('raw' or recipient.id)
  const [previewCustomerId, setPreviewCustomerId] = useState<string>('raw');

  const selectedSavedCount = savedRecipients.filter((r) => r.selected).length;

  React.useEffect(() => {
    if (template) {
      setCustomSubject(template.subject);
    }
  }, [template]);

  if (!isOpen) return null;

  const rightPositionClass = sidebarOpen ? 'lg:right-[440px] right-4' : 'right-4';

  if (isMinimized) {
    return (
      <div
        data-auth-bypass="true"
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-0 ${rightPositionClass} w-72 h-10 bg-[#f2f6fc] border border-gray-300 rounded-t-lg shadow-lg z-30 flex items-center justify-between px-3 cursor-pointer hover:bg-[#e8f0fe] transition-all select-none`}
        title="Bấm để mở rộng khung Preview & Soạn thư B2Cmail"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-bold text-gray-800">B2Cmail</span>
          <span className="text-[11px] text-gray-500 truncate">
            - {customSubject || 'Không có tiêu đề'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <ChevronUp className="w-4 h-4" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:text-red-600 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const activePreviewRecipient =
    previewCustomerId === 'raw'
      ? null
      : savedRecipients.find((r) => r.id === previewCustomerId) || savedRecipients[0] || null;

  const defaultDiscount = activeBrandKit?.discountCode || 'VIP2026';

  const renderedSubject =
    activePreviewRecipient && customSubject
      ? personalizeContent(customSubject, activePreviewRecipient, defaultDiscount)
      : customSubject;

  const renderedPreheader =
    template?.preheader && activePreviewRecipient
      ? personalizeContent(template.preheader, activePreviewRecipient, defaultDiscount)
      : template?.preheader || 'Dòng mô tả xem trước (Preheader) hiển thị cạnh tiêu đề trong hộp thư đến...';

  const rawHtmlSource =
    template?.bodyHtml ||
    (customBodyText.trim()
      ? `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; color: #1f2937; line-height: 1.6;">${customBodyText
          .split('\n')
          .map((line) => `<p style="margin: 0 0 8px 0;">${line}</p>`)
          .join('')}${
          activeBrandKit?.signatureHtml
            ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;"/><div style="font-size:11px;color:#64748b;">${activeBrandKit.signatureHtml}</div>`
            : ''
        }</div>`
      : '');

  const renderedBodyHtml =
    rawHtmlSource && activePreviewRecipient
      ? personalizeContent(rawHtmlSource, activePreviewRecipient, defaultDiscount)
      : rawHtmlSource;

  const hasContent = Boolean(template || customBodyText.trim());

  const handleCopyAction = async (mode: 'full' | 'subject' | 'html') => {
    if (!hasContent) return;
    try {
      const textToCopy =
        mode === 'subject'
          ? renderedSubject
          : mode === 'html'
          ? renderedBodyHtml
          : `Subject Line: ${renderedSubject}\nPreheader: ${renderedPreheader}\n\n${
              template?.bodyText || customBodyText
            }\n\nCTA: ${template?.ctaText || 'Xem chi tiết'} (${
              template?.ctaUrl || 'https://b2cmail.vn'
            })`;

      await navigator.clipboard.writeText(textToCopy);
      setCopiedMode(mode);
      const labelMap = {
        full: 'toàn bộ nội dung mẫu email',
        subject: 'tiêu đề Subject Line',
        html: 'mã nguồn HTML',
      };
      onCopySuccess(`✅ Đã sao chép ${labelMap[mode]} vào Clipboard!`);
      setTimeout(() => setCopiedMode((prev) => (prev === mode ? null : prev)), 2200);
    } catch {
      onCopySuccess('Đã sao chép vào bộ nhớ tạm!');
    }
  };

  const handleApplyAiSchedule = () => {
    if (sendTimeTip?.suggestedDateTimeIso) {
      onSetScheduledTime(sendTimeTip.suggestedDateTimeIso);
      setShowScheduleDropdown(false);
      onCopySuccess(`⏰ Đã hẹn giờ gửi: ${sendTimeTip.bestDays} (${sendTimeTip.bestHours})!`);
    }
  };

  const handleQuickSaveClick = () => {
    const cleanEmail = recipient.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      onCopySuccess('Vui lòng nhập địa chỉ email hợp lệ vào ô "Tới" để lưu người nhận.');
      return;
    }
    const nameToSave = recipientNameInput.trim() || deriveNameFromEmail(cleanEmail);
    onQuickSaveRecipient(nameToSave, cleanEmail);
    setRecipientNameInput('');
  };

  const displayBrandName = brandName.trim() || activeBrandKit?.brandName || 'Thương hiệu B2Cmail';
  const brandInitial = displayBrandName.charAt(0).toUpperCase();
  const brandColor = activeBrandKit?.primaryColor || '#2563eb';

  return (
    <div
      data-auth-bypass="true"
      className={`${
        isMaximized
          ? 'fixed inset-2 sm:inset-4 z-40 rounded-xl shadow-2xl'
          : 'flex flex-col flex-1 h-full min-h-0 rounded-t-xl shadow-xs'
      } bg-white border border-gray-300 flex flex-col overflow-hidden transition-all duration-150`}
    >
      {/* 1. TOP HEADER + DESKTOP / MOBILE / HTML PREVIEW SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#f2f6fc] border-b border-gray-200 text-gray-800 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-gray-900 truncate">
            Hộp thư B2Cmail
          </span>
          {template && (
            <span className="text-[11px] text-blue-700 font-semibold truncate hidden sm:inline">
              · {template.title}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 text-gray-600 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Thu nhỏ thanh tiêu đề"
            className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors cursor-pointer"
            title="Thu nhỏ thanh tiêu đề"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            aria-label={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}
            className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors cursor-pointer"
            title={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. PREVIEW TOOLBAR: TEMPLATE TABS (MẪU 1/2/3) + REWRITE TONE BUTTONS + COPY BUTTONS */}
      <div className="px-3 py-1.5 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
        {/* Left: Template 1 / 2 / 3 Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {templates.length > 0 ? (
            templates.map((tpl, idx) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelectTemplate(tpl)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>Mẫu {idx + 1}</span>
                  <span className="hidden sm:inline font-normal opacity-90">
                    ({idx === 0 ? 'Trực diện' : idx === 1 ? 'Kể chuyện' : 'Khẩn cấp FOMO'})
                  </span>
                </button>
              );
            })
          ) : (
            <span className="text-[11px] font-semibold text-gray-500">
              Chưa có mẫu email (Nhập thông tin ở bảng bên phải để AI sinh 03 mẫu)
            </span>
          )}
        </div>

        {/* Center: Cụm nút "Viết lại theo tông khác" (🎩 Trang trọng | 😄 Hài hước | 🔥 Khẩn cấp) */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-semibold text-gray-500 mr-0.5">
            Viết lại theo tông:
          </span>
          {(
            [
              { id: 'formal', label: '🎩 Trang trọng' },
              { id: 'witty', label: '😄 Hài hước' },
              { id: 'urgent', label: '🔥 Khẩn cấp' },
            ] as { id: ToneType; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={isRewriting}
              onClick={() => onRewriteTone(t.id)}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTone === t.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-gray-50 hover:bg-indigo-50 text-gray-700 border-gray-200'
              } disabled:opacity-50`}
            >
              {t.label}
            </button>
          ))}
          {isRewriting && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>Đang viết lại...</span>
            </span>
          )}
        </div>

        {/* Right: Cụm nút "Copy từng mẫu" (Copy toàn bộ / Copy Subject / Copy HTML) */}
        {hasContent && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => handleCopyAction('full')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                copiedMode === 'full'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
              }`}
              title="Sao chép toàn bộ nội dung mẫu đang chọn"
            >
              {copiedMode === 'full' ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy mẫu này</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopyAction('subject')}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                copiedMode === 'subject'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
              title="Sao chép Subject Line"
            >
              {copiedMode === 'subject' ? '✓ Đã sao chép!' : 'Copy Subject'}
            </button>

            <button
              type="button"
              onClick={() => handleCopyAction('html')}
              className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                copiedMode === 'html'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
              title="Sao chép mã HTML"
            >
              {copiedMode === 'html' ? '✓ Đã sao chép!' : 'Copy HTML'}
            </button>
          </div>
        )}
      </div>

      {/* 3. ROLE, BRAND KIT & MERGE TAGS BAR */}
      <div className="px-3 py-1 bg-[#f8fafd] border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Kit Selector */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-0.5">
            <Palette
              className="w-3 h-3 shrink-0"
              style={{ color: brandColor }}
            />
            <label
              htmlFor="compose-brandkit-select"
              className="text-gray-600 font-semibold whitespace-nowrap text-[10px]"
            >
              Brand Kit:
            </label>
            <select
              id="compose-brandkit-select"
              aria-label="Chọn Brand Kit khi soạn thư"
              value={activeBrandKitId}
              onChange={(e) => onSelectBrandKit(e.target.value)}
              className="text-[11px] font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">
                {brandKits.length === 0 ? 'Mặc định' : '-- Chọn Brand Kit --'}
              </option>
              {brandKits.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {kit.brandName} ({kit.primaryColor})
                </option>
              ))}
            </select>
          </div>

          {/* Workspace Role Selector */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-0.5">
            <ShieldCheck className="w-3 h-3 text-indigo-600 shrink-0" />
            <label
              htmlFor="compose-role-select"
              className="text-gray-600 font-semibold whitespace-nowrap text-[10px]"
            >
              Vai trò:
            </label>
            <select
              id="compose-role-select"
              aria-label="Chọn Vai trò khi soạn thư"
              value={workspaceRole}
              onChange={(e) => onChangeWorkspaceRole(e.target.value as WorkspaceRole)}
              className="text-[11px] font-bold text-indigo-950 bg-transparent focus:outline-none cursor-pointer"
            >
              {(['copywriter', 'approver', 'admin'] as WorkspaceRole[]).map((r) => (
                <option key={r} value={r}>
                  {WORKSPACE_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Merge Tags Quick Insert */}
          <div className="hidden xl:flex items-center gap-1">
            <Tag className="w-3 h-3 text-blue-600" />
            {MERGE_TAG_CATALOG.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => onInsertMergeTag(item.tag)}
                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-mono text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                title={`Chèn biến ${item.tag}`}
              >
                +{item.tag}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Preview Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <label
            htmlFor="customer-preview-select"
            className="text-gray-600 font-semibold whitespace-nowrap text-[10px]"
          >
            Xem trộn biến:
          </label>
          <select
            id="customer-preview-select"
            aria-label="Chọn khách hàng để xem trước Merge Tags"
            value={previewCustomerId}
            onChange={(e) => {
              const val = e.target.value;
              setPreviewCustomerId(val);
              const found = savedRecipients.find((r) => r.id === val);
              if (found) {
                setRecipient(found.email);
              }
            }}
            className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-[11px] font-bold text-emerald-950 focus:outline-none cursor-pointer max-w-[210px] truncate"
          >
            <option value="raw">Biến gốc ({'{{Ten_Khach_Hang}}'})</option>
            {savedRecipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.company || 'VIP'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. RECIPIENT (TO) & SUBJECT INPUT BAR */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-1 border-b border-gray-200 text-xs text-gray-700 shrink-0 bg-white">
        <span className="font-semibold text-gray-500 text-[11px] shrink-0">Tới:</span>
        <input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Nhập email người nhận..."
          className="flex-1 min-w-[140px] bg-transparent focus:outline-none text-gray-900 font-medium text-xs"
        />
        <input
          type="text"
          value={recipientNameInput}
          onChange={(e) => setRecipientNameInput(e.target.value)}
          placeholder="Tên KH..."
          className="w-24 sm:w-28 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-800 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleQuickSaveClick}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-[11px] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-3 h-3" />
          <span>Lưu CRM</span>
        </button>
        <button
          type="button"
          onClick={onOpenRecipientsManager}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded text-[11px] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Users className="w-3 h-3 text-blue-600" />
          <span>Danh bạ ({selectedSavedCount}/{savedRecipients.length})</span>
        </button>
      </div>

      {/* 5. MAIN SCROLLABLE PREVIEW AREA: REAL GMAIL INBOX ROW + DETAILED EMAIL VIEW */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 bg-[#f4f6fa] space-y-3">
        {template ? (
          <>
            {/* A. MÔ PHỎNG DÒNG HIỂN THỊ NGOÀI DANH SÁCH HỘP THƯ ĐẾN GMAIL (INBOX LIST PREVIEW) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
                <span>
                  📥 Mô phỏng hiển thị ngoài Danh sách Hộp thư đến Gmail (Subject Line + Preheader):
                </span>
                <span className="text-blue-700">
                  Bấm vào từng dòng để chuyển đổi nhanh giữa 03 mẫu
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {templates.map((tpl, idx) => {
                  const isCurrent = tpl.id === template.id;
                  const rowSubject = activePreviewRecipient
                    ? personalizeContent(tpl.subject, activePreviewRecipient, defaultDiscount)
                    : tpl.subject;
                  const rowPreheader = activePreviewRecipient
                    ? personalizeContent(tpl.preheader, activePreviewRecipient, defaultDiscount)
                    : tpl.preheader;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => onSelectTemplate(tpl)}
                      className={`px-3 py-1.5 flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-blue-50/90 border-l-4 border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Square className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block" />
                      <Star
                        className={`w-3.5 h-3.5 shrink-0 hidden sm:block ${
                          isCurrent
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                      <span className="font-bold text-gray-900 shrink-0 w-28 sm:w-36 truncate text-[11px]">
                        {displayBrandName}
                      </span>
                      <div className="flex-1 min-w-0 truncate text-[11px]">
                        <span className="font-bold text-gray-900">{rowSubject}</span>
                        <span className="text-gray-400 mx-1.5">—</span>
                        <span className="text-gray-500">{rowPreheader}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 shrink-0">
                        10:30 AM
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* B. GIAO DIỆN MỞ ĐỌC CHI TIẾT TRONG HỘP THƯ THẬT (DESKTOP / MOBILE / HTML) */}
            {previewDevice === 'html' ? (
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-mono font-bold text-emerald-400">
                    Mã nguồn Email HTML chuẩn Table Layout (Tương thích Desktop & Mobile)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAction('html')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] cursor-pointer"
                  >
                    {copiedMode === 'html' ? '✓ Đã sao chép HTML!' : 'Sao chép HTML'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={14}
                  value={renderedBodyHtml}
                  className="w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 rounded-lg focus:outline-none resize-y border border-slate-800"
                />
              </div>
            ) : (
              <div
                className={`mx-auto transition-all duration-200 ${
                  previewDevice === 'mobile'
                    ? 'max-w-[375px] bg-white rounded-[28px] border-[6px] border-slate-800 shadow-xl overflow-hidden'
                    : 'max-w-3xl bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden'
                }`}
              >
                {/* Mobile Notch Bar when in Mobile Preview mode */}
                {previewDevice === 'mobile' && (
                  <div className="bg-slate-900 text-white px-4 py-1.5 flex items-center justify-between text-[10px] font-mono">
                    <span>9:41</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[9px]">
                      📱 Gmail Mobile Preview (375px)
                    </span>
                    <span>5G 100%</span>
                  </div>
                )}

                {/* Gmail Reading Pane Header: Subject + AI Forecast Badge */}
                <div className="p-3 sm:p-4 border-b border-gray-100 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Subject Line (Tiêu đề)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          Hộp thư đến x
                        </span>
                      </div>
                      <input
                        type="text"
                        value={renderedSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        aria-label="Tiêu đề email chiến dịch"
                        className="w-full text-sm sm:text-base font-bold text-gray-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1"
                      />
                    </div>

                    {/* Badge: 🤖 Dự báo bởi AI (Benchmark ngành) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        🤖 Dự báo bởi AI (Benchmark ngành)
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-gray-700">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <TrendingUp className="w-3 h-3" />
                          Open Rate: {template.estimatedOpenRate}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-blue-700">
                          CTR: {template.estimatedCTR}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preheader & CTA Breakdown Bar */}
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className="truncate">
                      <span className="font-bold text-slate-500">Preheader: </span>
                      <span className="text-slate-700">{renderedPreheader}</span>
                    </div>
                    <div className="truncate sm:text-right">
                      <span className="font-bold text-slate-500">Nút CTA: </span>
                      <span className="font-bold text-blue-700">{template.ctaText}</span>
                    </div>
                  </div>

                  {/* Sender Avatar, Brand Name, Recipient & Timestamp */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs"
                        style={{ backgroundColor: brandColor }}
                      >
                        {brandInitial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-900 text-xs truncate">
                            {displayBrandName}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono truncate">
                            &lt;marketing@b2cmail.vn&gt;
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          tới{' '}
                          <strong className="text-gray-700">
                            {activePreviewRecipient
                              ? `${activePreviewRecipient.name} (${activePreviewRecipient.email})`
                              : recipient || 'Khách hàng mục tiêu'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-gray-500 font-mono shrink-0">
                      <div>10:30 AM</div>
                      <div className="text-[10px] text-emerald-700 font-sans font-semibold">
                        SPF · DKIM ✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email HTML Body Render */}
                <div className="p-3 sm:p-5 bg-white text-xs leading-relaxed overflow-x-auto">
                  <div
                    className="email-body-render"
                    dangerouslySetInnerHTML={{ __html: renderedBodyHtml }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State when no template generated yet */
          <div className="h-full flex flex-col gap-3">
            <div className="p-4 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Bắt đầu với Trình tạo Email Marketing bằng AI</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Nhập thông tin chiến dịch ở bảng công cụ bên phải rồi bấm <strong>"Sinh 03 Mẫu Email Chiến Dịch (AI)"</strong> để tạo 03 mẫu email chuẩn HTML Mobile, hoặc tự soạn nội dung bên dưới.
                </p>
              </div>
            </div>

            <textarea
              value={customBodyText}
              onChange={(e) => setCustomBodyText(e.target.value)}
              placeholder="Hoặc tự soạn nội dung email mới tại đây (hỗ trợ chèn biến {{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}, {{Ma_Uu_Dai}})..."
              className="w-full flex-1 min-h-[180px] p-3 text-xs bg-white text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>
        )}

        {/* C. LIVE TRACKING SANDBOX STRIP (MINH BẠCH HÓA DỮ LIỆU THỰC TẾ) */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                🧪 Dữ liệu Mô phỏng Thực tế (Live Tracking Sandbox)
              </span>
              <span className="text-[11px] text-gray-600">
                Tách biệt hoàn toàn với chỉ số Dự báo AI — Ghi nhận sự kiện thực tế từ Backend API
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!hasContent || isSimulatingSend}
                onClick={onRunSendSimulation}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-[10px] transition-colors cursor-pointer disabled:opacity-50"
              >
                🚀 Chạy Gửi Mô Phỏng ({selectedSavedCount})
              </button>
              {onTriggerTestOpen && (
                <button
                  type="button"
                  onClick={onTriggerTestOpen}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-md text-[10px] transition-colors cursor-pointer"
                >
                  + Mở thư (Open Pixel)
                </button>
              )}
              {onTriggerTestClick && (
                <button
                  type="button"
                  onClick={onTriggerTestClick}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-md text-[10px] transition-colors cursor-pointer"
                >
                  + Click CTA
                </button>
              )}
              {onTriggerTestUnsubscribe && (
                <button
                  type="button"
                  onClick={onTriggerTestUnsubscribe}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold rounded-md text-[10px] transition-colors cursor-pointer"
                >
                  + Unsubscribe
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
              <span className="text-gray-500">Đã gửi:</span>
              <strong className="font-mono tabular-nums text-gray-900">
                {trackingStats?.sentCount ?? 0}
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200 flex items-center justify-between">
              <span className="text-blue-700">Lượt mở (Pixel):</span>
              <strong className="font-mono tabular-nums text-blue-900">
                {trackingStats?.openCount ?? 0}
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
              <span className="text-emerald-700">Lượt click CTA:</span>
              <strong className="font-mono tabular-nums text-emerald-900">
                {trackingStats?.clickCount ?? 0}
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200 flex items-center justify-between">
              <span className="text-amber-800">Hủy đăng ký:</span>
              <strong className="font-mono tabular-nums text-amber-900">
                {trackingStats?.unsubscribedCount ?? 0}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white border-t border-gray-200 select-none shrink-0 z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Primary Send Button with Dropup */}
          <div className="relative inline-flex rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={() =>
                hasContent && onSendRealEmailClick(recipient, renderedSubject, renderedBodyHtml)
              }
              disabled={!hasContent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-l-lg transition-colors active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              title="Gửi thư qua Gmail API"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi qua Gmail</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
              aria-label="Tùy chọn gửi và hẹn giờ"
              className="px-2 py-1.5 text-white bg-[#0b57d0] hover:bg-[#0842a0] border-l border-blue-600 rounded-r-lg transition-colors cursor-pointer"
              title="Tùy chọn gửi và hẹn giờ"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showScheduleDropdown && (
              <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 text-xs">
                <div className="px-3 py-2 font-bold text-gray-800 border-b border-gray-100 flex items-center justify-between">
                  <span>Hẹn giờ gửi tự động (Schedule Send)</span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                </div>
                {sendTimeTip && (
                  <button
                    type="button"
                    onClick={handleApplyAiSchedule}
                    className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg transition-colors mt-1 cursor-pointer"
                  >
                    <div className="font-semibold text-blue-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Gợi ý AI tối ưu: {sendTimeTip.bestDays}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Khung giờ: {sendTimeTip.bestHours}
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleDropdown(false);
                    onOpenSchedulePlanner();
                  }}
                  className="w-full text-left p-2.5 hover:bg-indigo-50 rounded-lg transition-colors mt-1 text-indigo-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Mở Bảng Lên Lịch & Tracking Thực Tế →</span>
                </button>
              </div>
            )}
          </div>

          {/* Enterprise Send Simulation + Tracking Pixel Injection */}
          <button
            type="button"
            disabled={!hasContent || isSimulatingSend}
            onClick={onRunSendSimulation}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
            title="Chạy POST /api/campaign/send-simulation: Trộn Merge Tags, nhúng Tracking Pixel 1x1 & link Unsubscribe"
          >
            {isSimulatingSend ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>Gửi thử nghiệm & Nhúng Pixel ({selectedSavedCount})</span>
          </button>

          {/* Auto-Send to all selected Saved Recipients */}
          <button
            type="button"
            disabled={!hasContent || isAutoSending || selectedSavedCount === 0}
            onClick={() =>
              hasContent &&
              onAutoSendToSaved(
                customSubject,
                renderedBodyHtml,
                template?.bodyText || customBodyText
              )
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
            title="Tự động cá nhân hóa và gửi hàng loạt cho những người nhận đã lưu"
          >
            {isAutoSending ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Users className="w-3.5 h-3.5" />
            )}
            <span>Phát tán hàng loạt ({selectedSavedCount})</span>
          </button>

          {/* Create Draft in Real Gmail */}
          <button
            type="button"
            onClick={() =>
              hasContent && onCreateDraftClick(recipient, renderedSubject, renderedBodyHtml)
            }
            disabled={isSavingDraft || !hasContent}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            title="Lưu thành thư nháp trong hộp thư Gmail"
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSavingDraft ? 'Đang lưu...' : 'Lưu nháp Gmail'}</span>
          </button>
        </div>

        {/* Right side of toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng khung soạn thư"
            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
            title="Đóng khung soạn thư"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
