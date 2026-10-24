import React from 'react';
import {
  PenSquare,
  Inbox,
  Users,
  CalendarClock,
  ShieldCheck,
  Palette,
  Activity,
  BarChart3,
  MailCheck,
  Settings,
} from 'lucide-react';
import { ApprovalStatus, BrandKit, ThemeMode } from '../types';
import { APPROVAL_STATUS_STEPS } from '../utils/enterpriseLogic';

interface GmailLeftNavProps {
  onComposeClick: () => void;
  activeFolder: string;
  setActiveFolder: (folder: string) => void;
  unreadCount?: number;
  campaignsCount?: number;
  receivedUnreadCount?: number;
  savedRecipientsCount?: number;
  scheduledPlansCount?: number;
  activeBrandKit?: BrandKit;
  approvalStatus?: ApprovalStatus;
  openCount?: number;
  clickCount?: number;
  themeMode?: ThemeMode;
}

export const GmailLeftNav: React.FC<GmailLeftNavProps> = ({
  onComposeClick,
  activeFolder,
  setActiveFolder,
  unreadCount = 0,
  campaignsCount = 0,
  receivedUnreadCount = 0,
  savedRecipientsCount = 0,
  scheduledPlansCount = 0,
  activeBrandKit,
  openCount = 0,
  clickCount = 0,
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'dark';

  const folders: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'inbox', label: 'Soạn thư & Mẫu Email', icon: Inbox, count: unreadCount },
    {
      id: 'campaigns',
      label: 'Chiến dịch',
      icon: BarChart3,
      count: campaignsCount,
    },
    {
      id: 'received',
      label: 'Đã nhận',
      icon: MailCheck,
      count: receivedUnreadCount,
    },
    {
      id: 'recipients',
      label: 'Danh bạ CRM & Biến',
      icon: Users,
      count: savedRecipientsCount,
    },
    {
      id: 'schedules',
      label: 'Lịch gửi & Tracking',
      icon: CalendarClock,
      count: scheduledPlansCount,
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      icon: Settings,
    },
  ];

  return (
    <nav
      className={`w-56 shrink-0 border-r flex flex-col justify-between py-3 pr-2.5 select-none text-xs transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-[#f6f8fc] border-gray-200/80 text-gray-800'
      }`}
    >
      <div>
        {/* Compose Campaign Button (Updated text to "Soạn thư" per user selection) */}
        <div className="px-3 mb-3.5">
          <button
            type="button"
            onClick={onComposeClick}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#c2e7ff] hover:bg-[#b3dcf8] text-[#001d35] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Soạn thư mới"
          >
            <PenSquare className="w-4 h-4 text-[#001d35] shrink-0" />
            <span className="text-xs whitespace-nowrap">Soạn thư</span>
          </button>
        </div>

        {/* Folder items */}
        <div className="space-y-0.5">
          {folders.map((item) => {
            const Icon = item.icon;
            const isActive = activeFolder === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveFolder(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-r-full font-medium transition-colors cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-blue-950 text-blue-200 font-bold'
                      : 'bg-[#d3e3fd] text-[#041e49] font-bold'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-gray-700 hover:bg-gray-200/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? isDark
                          ? 'text-blue-300'
                          : 'text-[#041e49]'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-gray-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[11px] font-bold tabular-nums ml-1 ${
                      isActive
                        ? isDark
                          ? 'text-blue-200'
                          : 'text-[#041e49]'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Brand Kit Info Card */}
        {activeBrandKit && (
          <div
            className={`mt-4 mx-2.5 p-2.5 rounded-xl border space-y-1.5 ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1.5 truncate">
                <Palette
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: activeBrandKit.primaryColor }}
                />
                <span className="truncate">{activeBrandKit.brandName}</span>
              </span>
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-gray-300"
                style={{ backgroundColor: activeBrandKit.primaryColor }}
                title={`Màu chủ đạo: ${activeBrandKit.primaryColor}`}
              />
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {activeBrandKit.industry} · Mã:{' '}
              <strong className="font-mono">
                {activeBrandKit.discountCode || 'AUTUMN40'}
              </strong>
            </div>
            <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 pt-0.5 border-t border-slate-200/60 dark:border-slate-700">
              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">SPF · DKIM · DMARC hợp lệ</span>
            </div>
          </div>
        )}

        {/* Live Tracking Summary */}
        <div
          className={`mt-3 mx-2.5 p-2.5 rounded-xl border space-y-1.5 ${
            isDark
              ? 'bg-slate-800/80 border-slate-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="text-[10px] text-slate-500 font-semibold">
            Thống kê Tương tác Thời gian thực
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-600" />
              Mở: <strong>{openCount}</strong>
            </span>
            <span>
              Click: <strong className="text-emerald-600">{clickCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Domain & Compliance Footer */}
      <div className="px-4 text-[10px] text-slate-500 space-y-1">
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full w-[38%]"></div>
        </div>
        <p className="pt-0.5 tabular-nums font-medium">
          B2Cmail Cloud · UserDB Sync
        </p>
      </div>
    </nav>
  );
};
