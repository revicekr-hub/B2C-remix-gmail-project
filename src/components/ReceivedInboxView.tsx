import React, { useState } from 'react';
import {
  Download,
  Inbox,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';
import {
  EnterpriseCampaignRecord,
  ReceivedInboxMessage,
  ReceivedQuickFilter,
} from '../types';
import { filterReceivedMessages } from '../utils/campaignAndInboxLogic';
import { downloadLocalAttachment } from '../utils/exportReportUtils';

interface ReceivedInboxViewProps {
  messages: ReceivedInboxMessage[];
  campaigns: EnterpriseCampaignRecord[];
  initialCampaignFilterId?: string;
  isSyncingGmail: boolean;
  onSyncFromGmailApi: () => void;
  onSimulateIncomingPartnerReply: () => void;
  onMarkMessageRead: (messageId: string) => void;
  onToggleMessageStar: (messageId: string) => void;
  onSendQuickThreadReply: (messageId: string, replyText: string) => void;
  onShowToast: (msg: string) => void;
}

export const ReceivedInboxView: React.FC<ReceivedInboxViewProps> = ({
  messages,
  campaigns,
  initialCampaignFilterId = 'all',
  isSyncingGmail,
  onSyncFromGmailApi,
  onSimulateIncomingPartnerReply,
  onMarkMessageRead,
  onToggleMessageStar,
  onSendQuickThreadReply,
  onShowToast,
}) => {
  const [quickFilter, setQuickFilter] = useState<ReceivedQuickFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>(
    initialCampaignFilterId || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMessageId, setSelectedMessageId] = useState<string>(
    messages[0]?.id || ''
  );
  const [replyDraft, setReplyDraft] = useState<string>('');

  // Sync campaign filter when navigated from a specific campaign
  React.useEffect(() => {
    if (initialCampaignFilterId) {
      setCampaignFilter(initialCampaignFilterId);
    }
  }, [initialCampaignFilterId]);

  const filteredMessages = filterReceivedMessages(
    messages,
    quickFilter,
    campaignFilter,
    searchQuery
  );

  const activeMessage =
    filteredMessages.find((m) => m.id === selectedMessageId) ||
    filteredMessages[0] ||
    null;

  const handleSelectMessage = (msg: ReceivedInboxMessage) => {
    setSelectedMessageId(msg.id);
    if (msg.isUnread) {
      onMarkMessageRead(msg.id);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMessage || !replyDraft.trim()) return;
    onSendQuickThreadReply(activeMessage.id, replyDraft.trim());
    setReplyDraft('');
  };

  const getTagColorClass = (type: string) => {
    if (type === 'partner') return 'text-indigo-700 font-bold';
    if (type === 'client') return 'text-emerald-700 font-bold';
    if (type === 'bounce_daemon') return 'text-rose-700 font-bold';
    return 'text-blue-700 font-semibold';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
      {/* Top Header */}
      <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Đã lọc sạch Quảng cáo (Promotions), Mạng xã hội (Social) & Spam
            </span>
            <span aria-hidden="true">·</span>
            <span>Tự động gắn thẻ Đối tác / Khách hàng / Chiến dịch</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5">
            Phân hệ Đã nhận (Thư từ Đối tác & Khách hàng)
          </h1>
        </div>

        {/* Sync & Simulate Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSimulateIncomingPartnerReply}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            title="Mô phỏng nhận thư phản hồi mới từ Đối tác/Khách hàng để kiểm tra tự động gắn thẻ"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nhận thư phản hồi mẫu mới</span>
          </button>

          <button
            type="button"
            onClick={onSyncFromGmailApi}
            disabled={isSyncingGmail}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncingGmail ? 'animate-spin' : ''}`}
            />
            <span>
              {isSyncingGmail ? 'Đang đồng bộ Gmail API...' : 'Đồng bộ Gmail INBOX'}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Filters Bar + Campaign Dropdown + Search */}
      <div className="px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Tất cả thư quan trọng' },
                { id: 'unread', label: 'Chưa đọc' },
                { id: 'from_client', label: 'Từ Khách hàng' },
                { id: 'from_partner', label: 'Từ Đối tác' },
                { id: 'has_attachment', label: 'Có tệp đính kèm' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuickFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  quickFilter === f.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filter by Campaign Name */}
          <select
            aria-label="Lọc theo tên Chiến dịch liên quan"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Tất cả chiến dịch liên quan</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                Chiến dịch: {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm người gửi, công ty, tiêu đề..."
            aria-label="Tìm người gửi, công ty, tiêu đề"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* 2-Column Split-Pane View: Left Message List + Right Preview Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT COLUMN:Filtered Message List (5 cols on lg) */}
        <div className="lg:col-span-5 border-r border-slate-200 overflow-y-auto divide-y divide-slate-200 bg-slate-50/40">
          {filteredMessages.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                Không có thư nào khớp với bộ lọc
              </div>
              <p className="text-xs text-slate-500">
                Hãy chọn "Tất cả thư quan trọng" hoặc chuyển bộ lọc Chiến dịch về mặc định.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = activeMessage?.id === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => handleSelectMessage(msg)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                    isSelected
                      ? 'bg-blue-50/90'
                      : msg.isUnread
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50/60 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span
                        className={`text-xs truncate ${
                          msg.isUnread
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {msg.fromName}
                      </span>
                      {msg.isUnread && (
                        <span className="text-[10px] font-bold text-blue-700">
                          · MỚI
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                      {new Date(msg.receivedAtIso).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    {msg.fromEmail} {msg.company ? `· ${msg.company}` : ''}
                  </div>

                  {/* Auto-classified Tags */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]">
                    {msg.autoTags.map((tag, idx) => (
                      <span key={idx} className={getTagColorClass(tag.type)}>
                        {tag.label}
                      </span>
                    ))}
                    {msg.attachments.length > 0 && (
                      <span className="text-slate-600 flex items-center gap-1 font-medium">
                        <Paperclip className="w-3 h-3" />
                        {msg.attachments.length} tệp
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-xs mt-1.5 truncate ${
                      msg.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                    }`}
                  >
                    {msg.subject}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {msg.snippet}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: Preview Pane (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 overflow-y-auto bg-white">
          {!activeMessage ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Mail className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-sm font-medium text-slate-600">
                Chọn một thư ở cột bên trái để đọc nhanh nội dung & chuỗi hội thoại
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Message Header & Auto-Matched Tags */}
              <div className="border-b border-slate-200 pb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {activeMessage.autoTags.map((tag, i) => (
                      <span key={i} className={getTagColorClass(tag.type)}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleMessageStar(activeMessage.id)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      title="Đánh dấu sao quan trọng"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          activeMessage.isStarred
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-mono text-slate-500">
                      Thread: {activeMessage.threadId}
                    </span>
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900">
                  {activeMessage.subject}
                </h2>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <strong className="text-slate-900">{activeMessage.fromName}</strong>{' '}
                      <span className="font-mono text-slate-500">
                        &lt;{activeMessage.fromEmail}&gt;
                      </span>
                      {activeMessage.company && (
                        <span className="text-slate-500"> · {activeMessage.company}</span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums text-slate-500">
                    {new Date(activeMessage.receivedAtIso).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Full HTML Content Preview */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500">
                  Nội dung HTML chi tiết:
                </div>
                <div
                  className="p-5 border border-slate-200 rounded-xl bg-white shadow-2xs"
                  dangerouslySetInnerHTML={{ __html: activeMessage.bodyHtml }}
                />
              </div>

              {/* Local Attachments Download Section */}
              {activeMessage.attachments.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Tệp đính kèm từ Đối tác / Khách hàng ({activeMessage.attachments.length})
                      </span>
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Đã lưu cục bộ (Offline-Ready)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeMessage.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {att.fileName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {att.fileSizeLabel}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            downloadLocalAttachment(att);
                            onShowToast(`📥 Đã tải xuống tệp đính kèm: ${att.fileName}`);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải xuống</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thread Conversation History */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      Lịch sử chuỗi hội thoại (Thread History · {activeMessage.threadHistory.length}{' '}
                      tin nhắn)
                    </span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    {activeMessage.threadId}
                  </span>
                </div>

                <div className="space-y-3">
                  {activeMessage.threadHistory.map((th) => (
                    <div
                      key={th.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        th.direction === 'outbound_campaign'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-blue-50/40 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="font-bold text-slate-800">
                          {th.senderName}{' '}
                          <span className="font-normal text-slate-500">
                            ({th.direction === 'outbound_campaign' ? 'Email chiến dịch gửi đi' : 'Phản hồi từ khách hàng/đối tác'})
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-slate-500">
                          {new Date(th.sentAtIso).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div
                        className="text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: th.bodyHtml }}
                      />
                    </div>
                  ))}
                </div>

                {/* Quick Reply Form inside Preview Pane */}
                <form onSubmit={handleSendReply} className="pt-2 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Phản hồi nhanh trong chuỗi hội thoại ({activeMessage.fromName}):
                  </label>
                  <textarea
                    rows={3}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder={`Nhập nội dung trả lời tới ${activeMessage.fromEmail}...`}
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Gửi phản hồi vào chuỗi hội thoại</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
