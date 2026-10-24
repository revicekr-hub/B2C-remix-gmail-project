import React, { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Mail,
  Paperclip,
  PieChart,
  Plus,
  Search,
  Send,
  Users,
  AlertTriangle,
  MessageSquareReply,
  Database,
} from 'lucide-react';
import {
  CampaignLifecycleStatus,
  EnterpriseCampaignRecord,
  ExportFormatType,
} from '../types';
import {
  computeCampaignKpis,
  filterCampaigns,
} from '../utils/campaignAndInboxLogic';
import {
  downloadLocalAttachment,
  exportAllCampaignsOverview,
  exportSingleCampaignReport,
} from '../utils/exportReportUtils';

interface CampaignManagementViewProps {
  campaigns: EnterpriseCampaignRecord[];
  storageEngine: 'IndexedDB' | 'LocalStorage';
  onCreateCampaignFromCurrentDraft: () => void;
  onOpenReceivedForCampaign: (campaignId: string) => void;
  onShowToast: (msg: string) => void;
}

export const CampaignManagementView: React.FC<CampaignManagementViewProps> = ({
  campaigns,
  storageEngine,
  onCreateCampaignFromCurrentDraft,
  onOpenReceivedForCampaign,
  onShowToast,
}) => {
  // List filters & view mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CampaignLifecycleStatus>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');

  // Selected campaign for detail view
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<
    'recipients' | 'content' | 'report'
  >('recipients');

  // Export state (with Skeleton loading indicator)
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormatLabel, setExportFormatLabel] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const filteredCampaigns = filterCampaigns(
    campaigns,
    searchQuery,
    statusFilter,
    dateRangeFilter
  );

  const selectedCampaign =
    campaigns.find((c) => c.id === selectedCampaignId) || null;

  const handleExportOverview = async (format: ExportFormatType) => {
    setExportMenuOpen(false);
    setIsExporting(true);
    setExportFormatLabel(format.toUpperCase());
    try {
      const fileName = await exportAllCampaignsOverview(filteredCampaigns, format);
      onShowToast(`📥 Đã xuất báo cáo tổng hợp (${format.toUpperCase()}): ${fileName}`);
    } catch (err) {
      console.error('Export overview error:', err);
      onShowToast('Lỗi khi xuất tệp báo cáo.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingle = async (
    camp: EnterpriseCampaignRecord,
    format: ExportFormatType
  ) => {
    setExportMenuOpen(false);
    setIsExporting(true);
    setExportFormatLabel(format.toUpperCase());
    try {
      const fileName = await exportSingleCampaignReport(camp, format);
      onShowToast(
        `📥 Đã xuất báo cáo chiến dịch "${camp.name}" (${format.toUpperCase()}): ${fileName}`
      );
    } catch (err) {
      console.error('Export single campaign error:', err);
      onShowToast('Lỗi khi xuất báo cáo chiến dịch.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatStatusLabel = (status: CampaignLifecycleStatus) => {
    if (status === 'completed') return 'Đã hoàn thành';
    if (status === 'running') return 'Đang chạy';
    return 'Nháp';
  };

  const getStatusTextClass = (status: CampaignLifecycleStatus) => {
    if (status === 'completed') return 'text-emerald-700 font-semibold';
    if (status === 'running') return 'text-blue-700 font-semibold';
    return 'text-amber-700 font-semibold';
  };

  // ==========================================================================
  // RENDER CAMPAIGN DETAIL VIEW (3 TABS: KHÁCH HÀNG, NỘI DUNG, BÁO CÁO KẾT QUẢ)
  // ==========================================================================
  if (selectedCampaign) {
    const kpis = computeCampaignKpis(selectedCampaign);
    const waitingReplyCount = Math.max(0, kpis.deliveredCount - kpis.repliedCount);

    // Pie Chart SVG calculations
    const totalForPie = Math.max(1, kpis.totalSent);
    const repliedRatio = kpis.repliedCount / totalForPie;
    const waitingRatio = waitingReplyCount / totalForPie;
    const bouncedRatio = kpis.bouncedCount / totalForPie;

    const r = 54;
    const circumference = 2 * Math.PI * r;
    const repliedDash = repliedRatio * circumference;
    const waitingDash = waitingRatio * circumference;
    const bouncedDash = bouncedRatio * circumference;

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
        {/* Top Detail Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedCampaignId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Danh sách</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Chiến dịch</span>
                <span aria-hidden="true">·</span>
                <span>{selectedCampaign.brandName}</span>
                <span aria-hidden="true">·</span>
                <span className={getStatusTextClass(selectedCampaign.status)}>
                  {formatStatusLabel(selectedCampaign.status)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {new Date(selectedCampaign.launchedAtIso).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate mt-0.5">
                {selectedCampaign.name}
              </h2>
            </div>
          </div>

          {/* Right Actions: View Replies in Inbox + Export Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => onOpenReceivedForCampaign(selectedCampaign.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              <span>Xem thư phản hồi ({kpis.repliedCount})</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? `Đang xuất ${exportFormatLabel}...` : 'Xuất báo cáo'}</span>
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                    Xuất dữ liệu chiến dịch (Client-side)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportSingle(selectedCampaign, 'csv')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                  >
                    <span>Xuất tệp CSV (.csv)</span>
                    <span className="text-[11px] font-mono text-slate-400">UTF-8</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSingle(selectedCampaign, 'xlsx')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                  >
                    <span>Xuất bảng tính Excel (.xlsx)</span>
                    <span className="text-[11px] font-mono text-emerald-600">SheetJS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSingle(selectedCampaign, 'pdf')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                  >
                    <span>Xuất báo cáo PDF kèm Biểu đồ (.pdf)</span>
                    <span className="text-[11px] font-mono text-rose-600">jsPDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSingle(selectedCampaign, 'json')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                  >
                    <span>Xuất dữ liệu thô JSON (.json)</span>
                    <span className="text-[11px] font-mono text-blue-600">JSON</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skeleton Loading Bar when exporting large files */}
        {isExporting && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 animate-pulse space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>
                Đang kết xuất tệp báo cáo {exportFormatLabel} trực tiếp trên trình duyệt...
              </span>
              <span className="font-mono">100% Client-side</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded" />
            </div>
          </div>
        )}

        {/* Sub-navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-2">
            <button
              type="button"
              onClick={() => setActiveDetailTab('recipients')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeDetailTab === 'recipients'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tab Khách hàng ({selectedCampaign.recipients.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('content')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeDetailTab === 'content'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                Tab Nội dung & Đính kèm ({selectedCampaign.attachments.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab('report')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeDetailTab === 'report'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tab Báo cáo kết quả (KPI & Biểu đồ)</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden md:flex items-center gap-2 mb-2">
            <span>Tỷ lệ phản hồi:</span>
            <strong className="font-mono tabular-nums text-emerald-700">
              {kpis.replyRatePercent}% ({kpis.repliedCount}/{kpis.totalSent})
            </strong>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: KHÁCH HÀNG (RECIPIENTS / LEADS) */}
          {activeDetailTab === 'recipients' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Danh sách Khách hàng & Đối tác nhận chiến dịch
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tự động đối chiếu trạng thái phản hồi dựa trên <code className="font-mono">threadId</code> và tiêu đề thư từ Gmail API
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportSingle(selectedCampaign, 'xlsx')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất danh sách Excel (.xlsx)</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Khách hàng / Người nhận</th>
                      <th className="py-3 px-4">Công ty / Đối tác</th>
                      <th className="py-3 px-4">Trạng thái gửi</th>
                      <th className="py-3 px-4">Trạng thái phản hồi</th>
                      <th className="py-3 px-4">Thời gian phản hồi</th>
                      <th className="py-3 px-4">Nội dung / Ghi chú đối chiếu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedCampaign.recipients.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{rec.name}</div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {rec.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{rec.company}</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.roleType === 'partner' ? '[Đối tác]' : '[Khách hàng]'} ·{' '}
                            <span className="font-mono">{rec.threadId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {rec.deliveryStatus === 'delivered' && (
                            <span className="text-emerald-700 font-semibold">
                              Gửi thành công
                            </span>
                          )}
                          {rec.deliveryStatus === 'bounced' && (
                            <span className="text-rose-700 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              Bị trả lại (Bounced)
                            </span>
                          )}
                          {rec.deliveryStatus === 'pending' && (
                            <span className="text-amber-700 font-semibold">
                              Chờ phát tán
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {rec.hasReplied ? (
                            <span className="text-blue-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              Đã phản hồi
                            </span>
                          ) : (
                            <span className="text-slate-500">Chưa phản hồi</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                          {rec.repliedAtIso
                            ? new Date(rec.repliedAtIso).toLocaleString('vi-VN')
                            : '—'}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {rec.replySnippet ? (
                            <p className="text-slate-700 line-clamp-2">{rec.replySnippet}</p>
                          ) : rec.bounceReason ? (
                            <p className="text-rose-600 font-mono text-[11px] line-clamp-2">
                              {rec.bounceReason}
                            </p>
                          ) : (
                            <span className="text-slate-400">Chưa có thư trả lời</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: NỘI DUNG (TEMPLATE & ATTACHMENTS) */}
          {activeDetailTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                  <div className="border-b border-slate-200 pb-3 space-y-1">
                    <div className="text-xs text-slate-500">
                      Tiêu đề thư đã gửi (Subject):
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {selectedCampaign.subject}
                    </div>
                    <div className="text-xs text-slate-500 pt-1">
                      Preheader: <span className="text-slate-700">{selectedCampaign.preheader}</span>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    Bản xem trước mẫu HTML đã triển khai:
                  </div>
                  <div
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: selectedCampaign.bodyHtml }}
                  />
                </div>
              </div>

              {/* Attachments Panel */}
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-slate-600" />
                      <span>Tệp đính kèm trong chiến dịch</span>
                    </h4>
                    <span className="text-xs font-mono text-slate-500">
                      {selectedCampaign.attachments.length} tệp
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Đã lưu cục bộ trong {storageEngine} — có thể tải xuống ngay cả khi Offline.
                  </p>

                  {selectedCampaign.attachments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Không có tệp đính kèm trong chiến dịch này.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedCampaign.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {att.fileName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {att.fileSizeLabel} · {att.mimeType}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                downloadLocalAttachment(att);
                                onShowToast(`📥 Đã tải tệp đính kèm: ${att.fileName}`);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tải về</span>
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto whitespace-pre-wrap max-h-28">
                            {att.contentPreview}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BÁO CÁO KẾT QUẢ (CAMPAIGN REPORT DASHBOARD WITH KPI CARDS & CHARTS) */}
          {activeDetailTab === 'report' && (
            <div className="space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Tổng mail đã gửi</span>
                    <Send className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                    {kpis.totalSent}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    100% danh sách mục tiêu trong chiến dịch
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Số mail gửi thành công</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-2">
                    {kpis.deliveredCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                    Tỷ lệ vào hộp thư: {kpis.deliveryRatePercent}%
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Số mail bị trả lại (Bounced)</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums mt-2">
                    {kpis.bouncedCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Phát hiện tự động qua <code className="font-mono">mailer-daemon</code> ({kpis.bounceRatePercent}%)
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Khách hàng đã phản hồi (Replied)</span>
                    <MessageSquareReply className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums mt-2">
                    {kpis.repliedCount}
                  </div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1 font-mono tabular-nums">
                    Tỷ lệ phản hồi: {kpis.replyRatePercent}%
                  </div>
                </div>
              </div>

              {/* Charts Row: Bar/Line Chart (Engagement Over Time) + Pie Chart (Conversion/Reply Breakdown) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar & Line Chart: Engagement over time */}
                <div className="lg:col-span-2 border border-slate-200 rounded-xl p-5 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <span>Biểu đồ Lượng tương tác theo thời gian</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Theo dõi Lượt mở (Opened), Lượt nhấp (Clicked) và Phản hồi thực tế (Replied)
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
                          Đã mở
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                          Đã click
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
                          Đã phản hồi
                        </span>
                      </div>
                    </div>

                    {/* Grouped Bar Visual Chart */}
                    <div className="pt-4 pb-2 px-2 border border-slate-100 rounded-lg bg-slate-50/50">
                      <div className="grid grid-cols-4 gap-4 items-end h-48 pt-6 px-4">
                        {selectedCampaign.timelineSeries.map((pt, index) => {
                          const maxMetric = Math.max(
                            1,
                            kpis.totalSent,
                            ...selectedCampaign.timelineSeries.map((x) =>
                              Math.max(x.opened, x.clicked, x.replied, x.sent)
                            )
                          );
                          const openH = Math.max(8, Math.round((pt.opened / maxMetric) * 130));
                          const clickH = Math.max(8, Math.round((pt.clicked / maxMetric) * 130));
                          const replyH = Math.max(8, Math.round((pt.replied / maxMetric) * 130));

                          return (
                            <div
                              key={index}
                              className="flex flex-col items-center justify-end h-full"
                            >
                              <div className="flex items-end justify-center gap-2 w-full h-36 border-b border-slate-300 pb-1">
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-mono tabular-nums text-blue-700 font-bold mb-1">
                                    {pt.opened}
                                  </span>
                                  <div
                                    style={{ height: `${openH}px` }}
                                    className="w-4 bg-blue-500 rounded-t transition-all"
                                    title={`Đã mở: ${pt.opened}`}
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-mono tabular-nums text-emerald-700 font-bold mb-1">
                                    {pt.clicked}
                                  </span>
                                  <div
                                    style={{ height: `${clickH}px` }}
                                    className="w-4 bg-emerald-500 rounded-t transition-all"
                                    title={`Đã click: ${pt.clicked}`}
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-mono tabular-nums text-indigo-700 font-bold mb-1">
                                    {pt.replied}
                                  </span>
                                  <div
                                    style={{ height: `${replyH}px` }}
                                    className="w-4 bg-indigo-600 rounded-t transition-all"
                                    title={`Đã phản hồi: ${pt.replied}`}
                                  />
                                </div>
                              </div>
                              <div className="text-[11px] font-medium text-slate-600 mt-2 text-center">
                                {pt.dateLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                    <span>
                      Nguồn dữ liệu: Đồng bộ tự động qua <code className="font-mono">threadId</code> & Tracking Pixel
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportSingle(selectedCampaign, 'pdf')}
                        className="text-blue-700 hover:underline font-semibold cursor-pointer"
                      >
                        Tải bản PDF có biểu đồ →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pie / Donut Chart: Conversion & Reply Ratio */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-indigo-600" />
                      <span>Biểu đồ Tròn Tỷ lệ Phản hồi & Chuyển đổi</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Phân bổ kết quả trên tổng số {kpis.totalSent} khách hàng mục tiêu
                    </p>

                    <div className="my-5 flex items-center justify-center">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#e2e8f0"
                            strokeWidth="16"
                          />
                          {/* Replied Slice (Indigo) */}
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#4f46e5"
                            strokeWidth="16"
                            strokeDasharray={`${repliedDash} ${circumference}`}
                            strokeDashoffset={0}
                          />
                          {/* Waiting Reply Slice (Emerald) */}
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="16"
                            strokeDasharray={`${waitingDash} ${circumference}`}
                            strokeDashoffset={-repliedDash}
                          />
                          {/* Bounced Slice (Rose) */}
                          <circle
                            cx="70"
                            cy="70"
                            r={r}
                            fill="transparent"
                            stroke="#ef4444"
                            strokeWidth="16"
                            strokeDasharray={`${bouncedDash} ${circumference}`}
                            strokeDashoffset={-(repliedDash + waitingDash)}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                            {kpis.replyRatePercent}%
                          </span>
                          <span className="text-[10px] text-slate-500">Đã phản hồi</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="flex items-center gap-2 text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                          Đã phản hồi (Replied)
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {kpis.repliedCount} ({kpis.replyRatePercent}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="flex items-center gap-2 text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                          Đã nhận · Chưa phản hồi
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {waitingReplyCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                          Bị trả lại (Mailer-Daemon)
                        </span>
                        <span className="font-mono tabular-nums font-bold text-rose-700">
                          {kpis.bouncedCount} ({kpis.bounceRatePercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER CAMPAIGNS LIST VIEW (DATA TABLE / CARD GRID + FILTERS + EXPORT)
  // ==========================================================================
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Quản trị Chiến dịch Doanh nghiệp</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-slate-600">
              <Database className="w-3 h-3 text-blue-600" />
              Lưu trữ bền vững: <strong>{storageEngine} (Offline-Ready)</strong>
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5">
            Phân hệ Chiến dịch (Campaign Management & Analytics)
          </h1>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCreateCampaignFromCurrentDraft}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lưu thư đang soạn vào Chiến dịch</span>
          </button>

          {/* Export Overview Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? `Đang xuất ${exportFormatLabel}...` : 'Xuất báo cáo'}</span>
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                  Xuất danh sách chiến dịch (Client-side)
                </div>
                <button
                  type="button"
                  onClick={() => handleExportOverview('csv')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                >
                  <span>Xuất CSV (.csv)</span>
                  <span className="text-[11px] font-mono text-slate-400">UTF-8</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportOverview('xlsx')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                >
                  <span>Xuất Excel (.xlsx)</span>
                  <span className="text-[11px] font-mono text-emerald-600">SheetJS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportOverview('pdf')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                >
                  <span>Xuất PDF Tóm tắt (.pdf)</span>
                  <span className="text-[11px] font-mono text-rose-600">jsPDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportOverview('json')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                >
                  <span>Xuất JSON (.json)</span>
                  <span className="text-[11px] font-mono text-blue-600">JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skeleton Loading State when exporting */}
      {isExporting && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 animate-pulse space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Đang tạo tệp báo cáo {exportFormatLabel} trực tiếp tại trình duyệt...</span>
            <span className="font-mono">Offline-Ready</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded" />
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên chiến dịch, thương hiệu..."
              aria-label="Tìm kiếm theo tên chiến dịch"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Tất cả trạng thái' },
                { id: 'completed', label: 'Đã hoàn thành' },
                { id: 'running', label: 'Đang chạy' },
                { id: 'draft', label: 'Nháp' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Lọc theo khoảng thời gian"
              value={dateRangeFilter}
              onChange={(e) =>
                setDateRangeFilter(e.target.value as 'all' | '7d' | '30d' | '90d')
              }
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Mọi thời gian</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">90 ngày qua</option>
            </select>
          </div>
        </div>

        {/* Table vs Card Grid Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Bảng (Table)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Thẻ (Grid)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredCampaigns.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-12 text-center space-y-2">
            <Mail className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              Không tìm thấy chiến dịch phù hợp
            </div>
            <p className="text-xs text-slate-500">
              Hãy thử xóa bộ lọc tìm kiếm hoặc lưu mẫu email đang soạn thành chiến dịch mới.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse text-xs min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Tên chiến dịch</th>
                  <th className="py-3.5 px-4">Ngày triển khai</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Tổng KH nhận</th>
                  <th className="py-3.5 px-4 text-right">Tỷ lệ phản hồi (Gmail API)</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCampaigns.map((camp) => {
                  const kpi = computeCampaignKpis(camp);
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setActiveDetailTab('recipients');
                      }}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 hover:text-blue-700">
                          {camp.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                          {camp.brandName} · {camp.subject}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {new Date(camp.launchedAtIso).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={getStatusTextClass(camp.status)}>
                          {formatStatusLabel(camp.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-800">
                        {kpi.totalSent} KH
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <span className="font-bold text-indigo-700">
                          {kpi.replyRatePercent}%
                        </span>{' '}
                        <span className="text-slate-500">
                          ({kpi.repliedCount}/{kpi.totalSent} phản hồi)
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCampaignId(camp.id);
                              setActiveDetailTab('report');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                          >
                            Báo cáo & KH
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSingle(camp, 'xlsx')}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                            title="Tải nhanh báo cáo Excel (.xlsx)"
                          >
                            .XLSX
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.map((camp) => {
              const kpi = computeCampaignKpis(camp);
              return (
                <div
                  key={camp.id}
                  onClick={() => {
                    setSelectedCampaignId(camp.id);
                    setActiveDetailTab('recipients');
                  }}
                  className="border border-slate-200 rounded-xl p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>{camp.brandName}</span>
                      <span className={getStatusTextClass(camp.status)}>
                        {formatStatusLabel(camp.status)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {camp.subject}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ngày triển khai:</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {new Date(camp.launchedAtIso).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tổng khách hàng nhận:</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {kpi.totalSent} người nhận
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tỷ lệ phản hồi:</span>
                      <span className="font-mono tabular-nums font-bold text-indigo-700">
                        {kpi.replyRatePercent}% ({kpi.repliedCount} thư trả lời)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
