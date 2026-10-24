import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  CalendarClock,
  Send,
  Sparkles,
  CheckCircle2,
  Trash2,
  Clock,
  Play,
  Pause,
  FileEdit,
  CheckSquare,
  Square,
  Search,
  Upload,
  Eye,
  RotateCw,
  MailCheck,
  Tag,
} from 'lucide-react';
import {
  CampaignTrackingStats,
  EmailTemplate,
  RecipientGroup,
  SavedRecipient,
  ScheduledEmailPlan,
  SendSimulationResponse,
  SendTimeTip,
} from '../types';
import {
  RECIPIENT_GROUP_LABELS,
  buildRecommendedTimeSlots,
  formatCountdownVi,
  isValidEmail,
  parseBulkRecipientsInput,
  personalizeContent,
} from '../utils/schedulerLogic';

interface RecipientAndScheduleManagerProps {
  activeSubView: 'recipients' | 'schedules';
  setActiveSubView: (view: 'recipients' | 'schedules') => void;
  recipients: SavedRecipient[];
  onAddRecipient: (recipient: Omit<SavedRecipient, 'id' | 'sendCount'>) => void;
  onAddBulkRecipients: (newRecipients: Omit<SavedRecipient, 'id' | 'sendCount'>[]) => void;
  onToggleSelectRecipient: (id: string) => void;
  onSelectGroupRecipients: (group: RecipientGroup, select: boolean) => void;
  onDeleteRecipient: (id: string) => void;
  templates: EmailTemplate[];
  selectedTemplateId: string;
  sendTimeTip: SendTimeTip | null;
  brandName: string;
  scheduledPlans: ScheduledEmailPlan[];
  onCreateScheduledPlan: (planData: {
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
  }) => void;
  onTriggerAutoSendForSaved: (
    subject: string,
    bodyHtml: string,
    bodyText: string,
    targetRecipients: SavedRecipient[]
  ) => void;
  onExecutePlanNow: (planId: string) => void;
  onTogglePlanPause: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  isAutoSending: boolean;
  autoSendProgress: { sent: number; total: number; currentEmail: string } | null;
  nowMs: number;
  onShowToast: (msg: string) => void;
  trackingStats?: CampaignTrackingStats;
  lastSimulationResult?: SendSimulationResponse | null;
  onRunSendSimulation?: () => void;
  onTriggerTestOpen?: () => void;
  onTriggerTestClick?: () => void;
  onTriggerTestUnsubscribe?: () => void;
}

export const RecipientAndScheduleManager: React.FC<RecipientAndScheduleManagerProps> = ({
  activeSubView,
  setActiveSubView,
  recipients,
  onAddRecipient,
  onAddBulkRecipients,
  onToggleSelectRecipient,
  onSelectGroupRecipients,
  onDeleteRecipient,
  templates,
  selectedTemplateId,
  sendTimeTip,
  brandName,
  scheduledPlans,
  onCreateScheduledPlan,
  onTriggerAutoSendForSaved,
  onExecutePlanNow,
  onTogglePlanPause,
  onDeletePlan,
  isAutoSending,
  autoSendProgress,
  nowMs,
  onShowToast,
  trackingStats,
  lastSimulationResult,
  onRunSendSimulation,
  onTriggerTestOpen,
  onTriggerTestClick,
  onTriggerTestUnsubscribe,
}) => {
  // Single recipient form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newGroup, setNewGroup] = useState<RecipientGroup>('vip');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Bulk import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkGroup, setBulkGroup] = useState<RecipientGroup>('vip');

  // Filter state
  const [groupFilter, setGroupFilter] = useState<RecipientGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-compose Plan Form State
  const defaultTpl =
    templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;
  const [planTitle, setPlanTitle] = useState(
    brandName ? `Kế hoạch gửi tự động - ${brandName}` : ''
  );
  const [planTemplateId, setPlanTemplateId] = useState(defaultTpl?.id || 'template-1');
  const [planSubject, setPlanSubject] = useState(
    defaultTpl?.subject || ''
  );
  const [planBodyHtml, setPlanBodyHtml] = useState(defaultTpl?.bodyHtml || '');
  const [planBodyText, setPlanBodyText] = useState(defaultTpl?.bodyText || '');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('slot-ai-primary');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(19, 30, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);

  // Sync template fields when user picks another template in the planner
  const handleSelectPlanTemplate = (tplId: string) => {
    setPlanTemplateId(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setPlanSubject(found.subject);
      setPlanBodyHtml(found.bodyHtml);
      setPlanBodyText(found.bodyText);
    }
  };

  const recommendedSlots = buildRecommendedTimeSlots(sendTimeTip, nowMs);

  const selectedRecipients = recipients.filter((r) => r.selected);

  const filteredRecipients = recipients.filter((r) => {
    const matchesGroup = groupFilter === 'all' || r.group === groupFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company && r.company.toLowerCase().includes(q));
    return matchesGroup && matchesQuery;
  });

  const handleAddSingleRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Vui lòng nhập địa chỉ email hợp lệ (VD: khachhang@congty.vn)');
      return;
    }
    setEmailError(null);
    onAddRecipient({
      name: newName.trim() || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      company: newCompany.trim() || undefined,
      group: newGroup,
      selected: true,
    });
    setNewName('');
    setNewEmail('');
    setNewCompany('');
  };

  const handleBulkImportSubmit = () => {
    const parsed = parseBulkRecipientsInput(bulkText, bulkGroup);
    if (parsed.valid.length === 0) {
      onShowToast('Không tìm thấy địa chỉ email hợp lệ nào trong nội dung đã nhập.');
      return;
    }
    onAddBulkRecipients(parsed.valid);
    setBulkText('');
    setShowBulkModal(false);
  };

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecipients.length === 0) {
      onShowToast('Vui lòng chọn ít nhất 1 người nhận đã lưu để lên lịch gửi tự động!');
      return;
    }
    if (!planSubject.trim()) {
      onShowToast('Vui lòng nhập tiêu đề email cho kế hoạch!');
      return;
    }

    let scheduledAtIso: string;
    let slotLabel: string;
    let isAiSlot = true;

    if (selectedSlotId === 'custom') {
      const parsedDate = new Date(customDateTime);
      scheduledAtIso = Number.isNaN(parsedDate.getTime())
        ? new Date(Date.now() + 3600000).toISOString()
        : parsedDate.toISOString();
      slotLabel = `Tùy chỉnh (${new Date(scheduledAtIso).toLocaleString('vi-VN')})`;
      isAiSlot = false;
    } else {
      const chosenSlot =
        recommendedSlots.find((s) => s.id === selectedSlotId) || recommendedSlots[0];
      // If user chooses the 15-second demo slot, compute fresh 15s from current click time
      if (chosenSlot.id === 'slot-demo-fast') {
        scheduledAtIso = new Date(Date.now() + 15 * 1000).toISOString();
      } else {
        scheduledAtIso = chosenSlot.scheduledAtIso;
      }
      slotLabel = `${chosenSlot.dayLabel} • ${chosenSlot.timeRange}`;
      isAiSlot = true;
    }

    onCreateScheduledPlan({
      planTitle: planTitle.trim() || `Chiến dịch ${brandName}`,
      templateId: planTemplateId,
      subject: planSubject,
      bodyHtml: planBodyHtml,
      bodyText: planBodyText,
      scheduledAtIso,
      recommendedSlotLabel: slotLabel,
      isAiRecommendedSlot: isAiSlot,
      autoSendEnabled,
      recipients: selectedRecipients,
    });
  };

  const sampleRecipientForPreview =
    selectedRecipients[previewRecipientIndex % Math.max(1, selectedRecipients.length)] ||
    recipients[0] || {
      name: 'Khách hàng',
      email: 'khachhang@email.com',
      company: 'Công ty',
    };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-t-xl border border-gray-200 mx-3 mt-2 mb-1 overflow-hidden shadow-xs">
      {/* Top Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#f2f6fc] border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubView('recipients')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubView === 'recipients'
                ? 'bg-[#0b57d0] text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Người Nhận Đã Lưu ({recipients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('schedules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubView === 'schedules'
                ? 'bg-[#0b57d0] text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>2. Kế Hoạch Soạn Trước & Hẹn Giờ ({scheduledPlans.length})</span>
          </button>
        </div>

        {/* Quick Auto-Send to Saved Recipients Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isAutoSending || selectedRecipients.length === 0}
            onClick={() =>
              onTriggerAutoSendForSaved(
                planSubject,
                planBodyHtml,
                planBodyText,
                selectedRecipients
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
          >
            {isAutoSending ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Đang gửi ({autoSendProgress?.sent || 0}/{autoSendProgress?.total || 0})...
                </span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Tự động gửi ngay ({selectedRecipients.length} đã lưu)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Auto-Send Progress Bar */}
      {isAutoSending && autoSendProgress && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
            <span>
              Đang tự động cá nhân hóa & gửi thư tới:{' '}
              <strong className="font-mono">{autoSendProgress.currentEmail}</strong> (
              {autoSendProgress.sent}/{autoSendProgress.total})
            </span>
          </div>
          <div className="w-48 bg-emerald-200 h-2 rounded-full overflow-hidden shrink-0">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{
                width: `${Math.round(
                  (autoSendProgress.sent / Math.max(1, autoSendProgress.total)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* VIEW 1: RECIPIENT INPUT, SAVED CONTACTS & AUTO-SEND */}
      {activeSubView === 'recipients' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Add New Recipient Form Card */}
          <form
            onSubmit={handleAddSingleRecipient}
            className="bg-[#f8fafd] p-3.5 rounded-xl border border-gray-200 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-xs font-bold text-gray-900">
                  Nhập & Lưu Người Nhận Mới vào Danh Bạ Tự Động Gửi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(!showBulkModal)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-gray-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Upload className="w-3 h-3" />
                <span>{showBulkModal ? 'Đóng nhập hàng loạt' : 'Nhập hàng loạt (Nhiều Email / CSV)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 whitespace-nowrap">
                  Họ và tên người nhận
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Nguyễn Minh Anh"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 whitespace-nowrap">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="VD: minhanh@congty.vn"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 whitespace-nowrap">
                  Công ty / Tổ chức
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Nhập tên công ty..."
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 whitespace-nowrap">
                  Nhóm khách hàng
                </label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as RecipientGroup)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="vip">Khách VIP</option>
                  <option value="loyal">Khách thân thiết</option>
                  <option value="new_lead">Khách mới (Lead)</option>
                  <option value="partner">Đối tác B2B</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="w-full px-3 py-1.5 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 h-[32px] flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Lưu người nhận</span>
                </button>
              </div>
            </div>
            {emailError && (
              <p className="text-[11px] text-red-600 font-medium">{emailError}</p>
            )}

            {/* Optional Bulk Import Drawer */}
            {showBulkModal && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-800">
                    Dán danh sách người nhận (mỗi dòng 1 người hoặc cách nhau bằng dấu phẩy, hỗ trợ:{' '}
                    <code className="bg-gray-200 px-1 rounded">Tên &lt;email@domain.com&gt;</code> hoặc{' '}
                    <code className="bg-gray-200 px-1 rounded">Tên, email@domain.com</code>)
                  </label>
                  <select
                    value={bulkGroup}
                    onChange={(e) => setBulkGroup(e.target.value as RecipientGroup)}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                  >
                    <option value="vip">Gán nhóm: Khách VIP</option>
                    <option value="loyal">Gán nhóm: Khách thân thiết</option>
                    <option value="new_lead">Gán nhóm: Khách mới (Lead)</option>
                    <option value="partner">Gán nhóm: Đối tác B2B</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Tên người nhận <email@domain.com>\nTên người nhận, email@domain.com`}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImportSubmit}
                    className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Nhập & Lưu toàn bộ danh sách
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Filter & Group Bulk Selection Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'vip', 'loyal', 'new_lead', 'partner'] as RecipientGroup[]).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setGroupFilter(grp)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    groupFilter === grp
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {RECIPIENT_GROUP_LABELS[grp]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên, email, công ty..."
                  className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                />
              </div>

              <button
                type="button"
                onClick={() => onSelectGroupRecipients(groupFilter, true)}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={() => onSelectGroupRecipients(groupFilter, false)}
                className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Saved Recipients High-Density Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                  <th className="py-2.5 px-3">Người nhận</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Nhóm · Công ty</th>
                  <th className="py-2.5 px-3 text-right">Lịch sử tự động gửi</th>
                  <th className="py-2.5 px-3 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Chưa có người nhận nào trong bộ lọc này. Hãy thêm người nhận ở biểu mẫu phía trên.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => onToggleSelectRecipient(r.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        r.selected ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelectRecipient(r.id);
                          }}
                          aria-label={`Chọn người nhận ${r.name}`}
                          className="text-blue-600 focus:outline-none"
                        >
                          {r.selected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{r.name}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-700 text-[11px]">{r.email}</td>
                      <td className="py-2.5 px-3 text-gray-600 text-[11px]">
                        <span>{RECIPIENT_GROUP_LABELS[r.group]}</span>
                        {r.company && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-gray-500">{r.company}</span>
                          </>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[11px] text-gray-600 whitespace-nowrap">
                        <span>Đã gửi {r.sendCount} lần</span>
                        {r.lastSentAt && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-emerald-700">
                              {new Date(r.lastSentAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTriggerAutoSendForSaved(planSubject, planBodyHtml, planBodyText, [
                                r,
                              ]);
                            }}
                            disabled={isAutoSending}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold text-[11px] transition-colors whitespace-nowrap"
                            title={`Tự động gửi ngay cho ${r.name}`}
                          >
                            Gửi ngay
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRecipient(r.id);
                            }}
                            aria-label={`Xóa người nhận ${r.name}`}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Xóa người nhận"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PRE-COMPOSE CAMPAIGN PLANNER, REAL-TIME TRACKING & RECOMMENDED SLOT AUTO-SCHEDULER */}
      {activeSubView === 'schedules' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* ENTERPRISE REAL-TIME TRACKING & SEND SIMULATION PANEL */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3" data-auth-bypass="true">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900">
                    Theo Dõi Hiệu Quả Thực Tế (Open Pixel 1x1 · Click Redirect · Suppression List)
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    🧪 Dữ liệu Mô phỏng Thực tế (Live Tracking Sandbox)
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Endpoint tích hợp: <code className="font-mono bg-gray-100 px-1 rounded">POST /api/campaign/send-simulation</code> · <code className="font-mono bg-gray-100 px-1 rounded">GET /api/track/open</code> · <code className="font-mono bg-gray-100 px-1 rounded">GET /api/track/click</code>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {onRunSendSimulation && (
                  <button
                    type="button"
                    onClick={onRunSendSimulation}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Chạy Gửi Mô Phỏng + Nhúng Pixel ({selectedRecipients.length})
                  </button>
                )}
                {onTriggerTestOpen && (
                  <button
                    type="button"
                    onClick={onTriggerTestOpen}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    + Kích hoạt Mở thư (Open Pixel)
                  </button>
                )}
                {onTriggerTestClick && (
                  <button
                    type="button"
                    onClick={onTriggerTestClick}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    + Kích hoạt Click CTA
                  </button>
                )}
                {onTriggerTestUnsubscribe && (
                  <button
                    type="button"
                    onClick={onTriggerTestUnsubscribe}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    + Test Unsubscribe
                  </button>
                )}
              </div>
            </div>

            {/* 4 KPI Stat Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-[10px] text-gray-500 font-semibold">Đã gửi (Merged Tags)</div>
                <div className="text-base font-bold text-gray-900 font-mono tabular-nums">
                  {trackingStats?.sentCount ?? 0} email
                </div>
              </div>
              <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200">
                <div className="text-[10px] text-blue-700 font-semibold">Lượt mở (Open Pixel)</div>
                <div className="text-base font-bold text-blue-900 font-mono tabular-nums">
                  {trackingStats?.openCount ?? 0} lượt mở
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <div className="text-[10px] text-emerald-700 font-semibold">Lượt click CTA (Redirect)</div>
                <div className="text-base font-bold text-emerald-900 font-mono tabular-nums">
                  {trackingStats?.clickCount ?? 0} lượt click
                </div>
              </div>
              <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200">
                <div className="text-[10px] text-amber-800 font-semibold">Hủy đăng ký (Unsubscribe)</div>
                <div className="text-base font-bold text-amber-900 font-mono tabular-nums">
                  {trackingStats?.unsubscribedCount ?? 0} email chặn
                </div>
              </div>
            </div>

            {/* Show embedded pixel & sample merged HTML if simulation ran */}
            {lastSimulationResult && lastSimulationResult.deliveries.length > 0 && (
              <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono space-y-1">
                <div className="text-emerald-400 font-bold">
                  ✓ Kết quả POST /api/campaign/send-simulation ({lastSimulationResult.sentCount} đã trộn Merge Tags & nhúng Tracking Pixel):
                </div>
                <div className="truncate text-slate-300">
                  • Tiêu đề đã trộn: <span className="text-white">{lastSimulationResult.deliveries[0].mergedSubject}</span>
                </div>
                <div className="truncate text-slate-300">
                  • Tracking Pixel 1x1: <span className="text-blue-300">{lastSimulationResult.deliveries[0].trackingPixelUrl}</span>
                </div>
                <div className="truncate text-slate-300">
                  • Link Unsubscribe: <span className="text-amber-300">{lastSimulationResult.deliveries[0].unsubscribeUrl}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left 7 cols: Pre-Compose Email Plan & Recommended Time Slot Picker */}
            <form
              onSubmit={handleCreatePlanSubmit}
              className="lg:col-span-7 bg-[#f8fafd] p-4 rounded-xl border border-gray-200 space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-blue-600 shrink-0" />
                    <h3 className="text-xs font-bold text-gray-900">
                      Lên Kế Hoạch Soạn Thư Trước & Hẹn Giờ Tự Động Gửi
                    </h3>
                  </div>
                  <span className="text-[11px] text-blue-700 font-semibold whitespace-nowrap shrink-0">
                    Người nhận: {selectedRecipients.length} người đã lưu
                  </span>
                </div>

                {/* Row 1: Plan Name & Template Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tên kế hoạch chiến dịch
                    </label>
                    <input
                      type="text"
                      value={planTitle}
                      onChange={(e) => setPlanTitle(e.target.value)}
                      placeholder="VD: Chiến dịch Thu VIP - Đợt 1"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Chọn mẫu thư nền (AI Templates)
                    </label>
                    <select
                      value={planTemplateId}
                      onChange={(e) => handleSelectPlanTemplate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} (Mở: {t.estimatedOpenRate})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Pre-composed Subject with Personalization Variables */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-semibold text-gray-700">
                      Tiêu đề thư soạn trước (Hỗ trợ biến cá nhân hóa)
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-500">Chèn biến:</span>
                      <button
                        type="button"
                        onClick={() => setPlanSubject((s) => `${s} {{name}}`)}
                        className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-mono cursor-pointer"
                      >
                        +{'{{name}}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanSubject((s) => `${s} {{company}}`)}
                        className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-mono cursor-pointer"
                      >
                        +{'{{company}}'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={planSubject}
                    onChange={(e) => setPlanSubject(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Row 3: Pre-composed Body Content */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-semibold text-gray-700">
                      Nội dung thư soạn trước (Tự động thay tên từng người nhận)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setPlanBodyText((b) => `Chào {{name}} (${'{{company}}'}),\n\n${b}`)
                      }
                      className="text-[10px] text-blue-700 hover:underline font-medium cursor-pointer"
                    >
                      + Chèn lời chào {'{{name}}'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={planBodyText}
                    onChange={(e) => setPlanBodyText(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Row 4: Recommended Time Slot Selector */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-900">
                    Chọn Khung Giờ & Ngày Đề Xuất Để Tự Động Gửi:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {recommendedSlots.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      return (
                        <div
                          key={slot.id}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-600'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="timeSlot"
                                checked={isSelected}
                                onChange={() => setSelectedSlotId(slot.id)}
                                className="text-blue-600 shrink-0"
                              />
                              <span className="font-bold text-gray-900 text-xs">{slot.label}</span>
                            </div>
                            <p className="text-[11px] text-gray-600 pl-5">{slot.reason}</p>
                          </div>
                          <div className="text-right shrink-0 font-mono tabular-nums text-[11px]">
                            <div className="font-bold text-blue-700">{slot.timeRange}</div>
                            <div className="text-emerald-700 text-[10px]">{slot.openRateBoost}</div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Option 4: Custom Date & Time Picker */}
                    <div
                      onClick={() => setSelectedSlotId('custom')}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-2 ${
                        selectedSlotId === 'custom'
                          ? 'bg-blue-50/70 border-blue-600'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="timeSlot"
                          checked={selectedSlotId === 'custom'}
                          onChange={() => setSelectedSlotId('custom')}
                          className="text-blue-600"
                        />
                        <span className="font-bold text-gray-900 text-xs">
                          Chọn ngày & khung giờ tùy chỉnh:
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={customDateTime}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlotId('custom');
                        }}
                        onChange={(e) => {
                          setSelectedSlotId('custom');
                          setCustomDateTime(e.target.value);
                        }}
                        className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs font-mono tabular-nums text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendEnabled}
                    onChange={(e) => setAutoSendEnabled(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Tự động gửi khi tới giờ hẹn</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span>Lưu Kế Hoạch & Hẹn Giờ Tự Động Gửi</span>
                </button>
              </div>
            </form>

            {/* Right 5 cols: Live Personalization Preview & Scheduled Plans Queue */}
            <div className="lg:col-span-5 flex flex-col gap-4 min-w-0">
              {/* Personalized Email Preview Card */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Xem trước cá nhân hóa</span>
                  </span>
                  {selectedRecipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPreviewRecipientIndex((i) => i + 1)}
                      className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Đổi người nhận ({(previewRecipientIndex % selectedRecipients.length) + 1}/
                      {selectedRecipients.length}) →
                    </button>
                  )}
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Tới:</span>
                    <span className="font-semibold text-gray-900 font-mono truncate">
                      {sampleRecipientForPreview.name} &lt;{sampleRecipientForPreview.email}&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Tiêu đề:</span>
                    <span className="font-bold text-blue-900 truncate">
                      {personalizeContent(planSubject, sampleRecipientForPreview)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-[11px] text-gray-700 whitespace-pre-line max-h-32 overflow-y-auto leading-relaxed">
                  {personalizeContent(planBodyText, sampleRecipientForPreview)}
                </div>
              </div>

              {/* Scheduled Plans Queue */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex-1 flex flex-col space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Hàng Đợi Kế Hoạch Gửi Tự Động ({scheduledPlans.length})</span>
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
                  {scheduledPlans.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      Chưa có kế hoạch hẹn giờ nào. Hãy tạo kế hoạch ở biểu mẫu bên trái!
                    </div>
                  ) : (
                    scheduledPlans.map((plan) => {
                      const isCompleted = plan.status === 'completed';
                      const isSending = plan.status === 'sending';
                      const isPaused = plan.status === 'paused';

                      return (
                        <div
                          key={plan.id}
                          className={`p-3 rounded-xl border transition-all space-y-2 ${
                            isCompleted
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : isSending
                              ? 'bg-blue-50/50 border-blue-300'
                              : 'bg-gray-50/70 border-gray-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <h4 className="font-bold text-gray-900 text-xs">{plan.planTitle}</h4>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded font-mono tabular-nums whitespace-nowrap shrink-0 ${
                                isCompleted
                                  ? 'text-emerald-800 bg-emerald-100'
                                  : isSending
                                  ? 'text-blue-800 bg-blue-100'
                                  : isPaused
                                  ? 'text-amber-800 bg-amber-100'
                                  : 'text-indigo-800 bg-indigo-100'
                              }`}
                            >
                              {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                              <span>
                                {isCompleted
                                  ? 'Đã tự động gửi xong'
                                  : isSending
                                  ? 'Đang gửi tự động...'
                                  : isPaused
                                  ? 'Đã tạm dừng'
                                  : formatCountdownVi(plan.scheduledAtIso, nowMs)}
                              </span>
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-700 font-medium truncate">
                            {plan.subject}
                          </p>

                          <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>
                              Khung giờ: <strong>{plan.recommendedSlotLabel}</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Người nhận: <strong>{plan.recipients.length} người</strong>
                            </span>
                          </div>

                          {/* Delivery logs summary if completed */}
                          {plan.deliveryLogs.length > 0 && (
                            <div className="bg-white p-2 rounded border border-emerald-200 text-[10px] space-y-1 max-h-24 overflow-y-auto">
                              <div className="font-bold text-emerald-800 flex items-center gap-1">
                                <MailCheck className="w-3 h-3 shrink-0" />
                                <span>
                                  Nhật ký tự động gửi ({plan.deliveryLogs.length}/
                                  {plan.recipients.length} thành công):
                                </span>
                              </div>
                              {plan.deliveryLogs.map((log) => (
                                <div
                                  key={log.recipientId}
                                  className="flex items-center justify-between gap-2 text-gray-600 font-mono tabular-nums"
                                >
                                  <span className="truncate">
                                    • {log.recipientName} ({log.recipientEmail})
                                  </span>
                                  <span className="text-emerald-700 shrink-0">
                                    {log.sentAt
                                      ? new Date(log.sentAt).toLocaleTimeString('vi-VN')
                                      : 'Đã gửi'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Plan Action Buttons */}
                          <div className="flex items-center justify-between pt-1 border-t border-gray-200/80 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {!isCompleted && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isSending || isAutoSending}
                                    onClick={() => onExecutePlanNow(plan.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                  >
                                    <Play className="w-3 h-3" />
                                    <span>Chạy gửi tự động ngay</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onTogglePlanPause(plan.id)}
                                    className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded font-medium transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    {isPaused ? (
                                      <>
                                        <Play className="w-3 h-3 text-blue-600" />
                                        <span>Tiếp tục</span>
                                      </>
                                    ) : (
                                      <>
                                        <Pause className="w-3 h-3 text-amber-600" />
                                        <span>Tạm dừng</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onDeletePlan(plan.id)}
                              aria-label={`Xóa kế hoạch ${plan.planTitle}`}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Xóa kế hoạch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
