import React from 'react';
import {
  Search,
  SlidersHorizontal,
  Send,
  Download,
  UserPlus,
  PanelRight,
  BookOpen,
} from 'lucide-react';
import { RegisteredUserAccount, ThemeMode } from '../types';

interface GmailHeaderProps {
  activeAccount: RegisteredUserAccount | null;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onOpenSettings: () => void;
  onOpenRealGmail: () => void;
  onOpenExtensionModal: () => void;
  onOpenGuideModal: () => void;
  leftNavOpen: boolean;
  onToggleLeftNav: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeBrandColor?: string;
  themeMode?: ThemeMode;
}

export const GmailHeader: React.FC<GmailHeaderProps> = ({
  activeAccount,
  onOpenAuthModal,
  onOpenRealGmail,
  onOpenExtensionModal,
  onOpenGuideModal,
  leftNavOpen,
  onToggleLeftNav,
  sidebarOpen,
  setSidebarOpen,
  activeBrandColor = '#2563eb',
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'dark';

  return (
    <header
      className={`min-h-14 py-1.5 border-b flex flex-wrap items-center justify-between px-3 sm:px-4 select-none shrink-0 z-20 gap-2 transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-[#f6f8fc] border-gray-200 text-gray-900'
      }`}
    >
      {/* Left: Toggle Left Sidebar + B2Cmail Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          data-auth-bypass="true"
          onClick={onToggleLeftNav}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            leftNavOpen
              ? isDark
                ? 'bg-slate-800 text-blue-400'
                : 'bg-gray-200/80 text-gray-800'
              : isDark
              ? 'hover:bg-slate-800 text-slate-400'
              : 'hover:bg-gray-200 text-gray-700'
          }`}
          title={leftNavOpen ? 'Ẩn thanh điều hướng trái' : 'Hiện thanh điều hướng trái'}
          aria-label="Ẩn hiện thanh điều hướng trái"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0"
            style={{ backgroundColor: activeBrandColor }}
          >
            B2C
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight leading-none">
                B2Cmail
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                · AI Email Marketing Studio
              </span>
            </div>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              03 Mẫu Email AI · Preview Hộp Thư Thật · Live Tracking
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Search Input (Hidden on very small screens to keep header clean) */}
      <div className="hidden lg:flex flex-1 max-w-md items-center gap-2 mx-2">
        <div
          className={`relative flex-1 flex items-center rounded-lg transition-all ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700/80 text-slate-100'
              : 'bg-[#eaf1fb] hover:bg-[#e1ebf9] focus-within:bg-white focus-within:shadow-sm focus-within:ring-1 focus-within:ring-gray-300'
          }`}
        >
          <div className="pl-3 pr-2 text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Tìm chiến dịch, khách hàng, merge tag..."
            className="w-full py-1.5 pr-8 bg-transparent text-xs placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            className="pr-2.5 text-slate-500 hover:text-slate-700"
            title="Bộ lọc tìm kiếm"
            aria-label="Bộ lọc tìm kiếm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Guide & Demo Button, Action Buttons, Toolbar Toggle & Auth Button */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Button 0: Guide & Demo Scenario Modal Button (Required on Header) */}
        <button
          type="button"
          data-auth-bypass="true"
          onClick={onOpenGuideModal}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Mở Hướng dẫn sử dụng & Kịch bản Demo 5 bước"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="hidden sm:inline">📖 Hướng dẫn sử dụng & Kịch bản Demo</span>
          <span className="sm:hidden">📖 Hướng dẫn Demo</span>
        </button>

        {/* Button 1: Real Gmail Open Button */}
        <button
          type="button"
          data-auth-bypass="true"
          onClick={onOpenRealGmail}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Sao chép nội dung & mở thư mới trong Gmail"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Mở trong Gmail</span>
        </button>

        {/* Button 2: Chrome Extension Modal Button */}
        <button
          type="button"
          data-auth-bypass="true"
          onClick={onOpenExtensionModal}
          className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              : 'text-slate-700 bg-white hover:bg-gray-100 border-gray-300'
          }`}
          title="Tải gói cài Extension / Google Workspace Apps Script"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Gói Chrome Extension</span>
        </button>

        {/* Button 3: Show/Hide Right AI Toolbar */}
        <button
          type="button"
          data-auth-bypass="true"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Ẩn hiện thanh công cụ"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            sidebarOpen
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
          }`}
          title={sidebarOpen ? 'Ẩn thanh công cụ AI bên phải' : 'Hiện thanh công cụ AI bên phải'}
        >
          <PanelRight className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {sidebarOpen ? 'Ẩn thanh công cụ' : 'Hiện thanh công cụ'}
          </span>
        </button>

        {/* Button 4: Register / Login with Email & Password */}
        <button
          type="button"
          data-auth-bypass="true"
          onClick={() => onOpenAuthModal(activeAccount ? 'login' : 'register')}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
          title="Đăng ký hoặc Đăng nhập bằng Email và Mật khẩu"
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[160px]">
            {activeAccount
              ? `Tài khoản: ${activeAccount.fullName}`
              : 'Đăng ký / Đăng nhập'}
          </span>
        </button>
      </div>
    </header>
  );
};
