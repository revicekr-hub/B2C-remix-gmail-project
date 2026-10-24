import React from 'react';
import {
  Building2,
  CheckCircle2,
  Database,
  Layout,
  LogIn,
  LogOut,
  Mail,
  Moon,
  PanelLeft,
  PanelRight,
  Phone,
  Settings,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { RegisteredUserAccount, ThemeMode } from '../types';
import { WORKSPACE_ROLE_LABELS } from '../utils/enterpriseLogic';

interface SettingsViewProps {
  themeMode: ThemeMode;
  onChangeThemeMode: (mode: ThemeMode) => void;
  leftNavOpen: boolean;
  onToggleLeftNav: () => void;
  rightToolbarOpen: boolean;
  onToggleRightToolbar: () => void;
  activeAccount: RegisteredUserAccount | null;
  savedAccounts: RegisteredUserAccount[];
  onSwitchAccount: (account: RegisteredUserAccount) => void;
  onOpenAddAnotherAccount: () => void;
  onOpenLoginModal: () => void;
  onLogoutAccount: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  themeMode,
  onChangeThemeMode,
  leftNavOpen,
  onToggleLeftNav,
  rightToolbarOpen,
  onToggleRightToolbar,
  activeAccount,
  savedAccounts,
  onSwitchAccount,
  onOpenAddAnotherAccount,
  onOpenLoginModal,
  onLogoutAccount,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* Top Header */}
      <div
        className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${
          isDark
            ? 'bg-slate-950/60 border-slate-800'
            : 'bg-slate-50/70 border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Settings className="w-3.5 h-3.5 text-blue-600" />
            <span>Cấu hình Không gian làm việc & Tài khoản Doanh nghiệp</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-600" />
              Lưu trữ: <strong>userDatabase (IndexedDB + LocalStorage)</strong>
            </span>
          </div>
          <h1 className="text-lg font-bold mt-0.5">
            Cài đặt Hệ thống & Quản lý Tài khoản
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAddAnotherAccount}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm tài khoản khác</span>
          </button>

          {activeAccount ? (
            <button
              type="button"
              onClick={onLogoutAccount}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl">
        {/* Left Column: Appearance (Dark/Light Mode) & Toolbar Visibility */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Theme Mode Card (Chế độ Sáng / Tối) */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isDark
                ? 'bg-slate-800/70 border-slate-700'
                : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                {isDark ? (
                  <Moon className="w-4 h-4 text-amber-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>Chế độ Giao diện (Sáng / Tối)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tùy chỉnh giao diện làm việc phù hợp với môi trường ánh sáng của bạn.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChangeThemeMode('light')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  themeMode === 'light'
                    ? 'border-blue-600 bg-blue-50/70 text-slate-900 font-bold'
                    : isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs">Chế độ Sáng</span>
                </div>
                {themeMode === 'light' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onChangeThemeMode('dark')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  themeMode === 'dark'
                    ? 'border-blue-500 bg-slate-950 text-white font-bold'
                    : 'border-slate-200 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">Chế độ Tối</span>
                </div>
                {themeMode === 'dark' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Show/Hide Toolbars Card (Ẩn / Hiện Thanh công cụ) */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isDark
                ? 'bg-slate-800/70 border-slate-700'
                : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layout className="w-4 h-4 text-blue-600" />
                <span>Ẩn / Hiện Thanh công cụ (Toolbars)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mở rộng tối đa không gian soạn thảo và phân tích dữ liệu khi cần thiết.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isDark
                    ? 'border-slate-700 bg-slate-900/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PanelLeft className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-semibold">Thanh điều hướng trái (Sidebar)</div>
                    <div className="text-[11px] text-slate-500">
                      Trạng thái: {leftNavOpen ? 'Đang hiển thị' : 'Đang ẩn'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleLeftNav}
                  className="px-3 py-1.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                >
                  {leftNavOpen ? 'Ẩn thanh trái' : 'Hiện thanh trái'}
                </button>
              </div>

              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isDark
                    ? 'border-slate-700 bg-slate-900/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PanelRight className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-semibold">Thanh công cụ AI & Brand Kit</div>
                    <div className="text-[11px] text-slate-500">
                      Trạng thái: {rightToolbarOpen ? 'Đang hiển thị' : 'Đang ẩn'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleRightToolbar}
                  className="px-3 py-1.5 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                >
                  {rightToolbarOpen ? 'Ẩn thanh công cụ' : 'Hiện thanh công cụ'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Current Account Profile & Multi-Account Database Switcher */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Account Profile Card */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isDark
                ? 'bg-slate-800/70 border-slate-700'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Tài khoản Đang Đăng nhập</span>
              </h2>
              {activeAccount && (
                <button
                  type="button"
                  onClick={onLogoutAccount}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất khỏi phiên này</span>
                </button>
              )}
            </div>

            {activeAccount ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div
                  className={`p-3 rounded-lg border ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-slate-500">Họ và tên</div>
                  <div className="font-bold text-sm mt-0.5">{activeAccount.fullName}</div>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email đăng nhập
                  </div>
                  <div className="font-mono font-bold mt-0.5">{activeAccount.email}</div>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Công ty / Tổ chức
                  </div>
                  <div className="font-semibold mt-0.5">
                    {activeAccount.company} · {activeAccount.jobTitle}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Số điện thoại & Vai trò
                  </div>
                  <div className="font-semibold mt-0.5">
                    {activeAccount.phone} · {WORKSPACE_ROLE_LABELS[activeAccount.role]}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl space-y-3">
                <p className="text-xs text-slate-500">
                  Bạn đã đăng xuất. Vui lòng đăng nhập lại bằng Email & Mật khẩu hoặc đăng ký tài khoản mới.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    Đăng nhập ngay
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAddAnotherAccount}
                    className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    Đăng ký tài khoản mới
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* All Registered Accounts in Database + "Thêm tài khoản khác" */}
          <div
            className={`p-5 rounded-xl border space-y-4 ${
              isDark
                ? 'bg-slate-800/70 border-slate-700'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>
                    Danh sách Tài khoản đã lưu trong Cơ sở dữ liệu ({savedAccounts.length})
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tất cả tài khoản đã đăng ký đều được bảo toàn khi đăng xuất hoặc tải lại trang.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddAnotherAccount}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Thêm tài khoản khác</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {savedAccounts.map((acc) => {
                const isCurrent = activeAccount?.id === acc.id;
                return (
                  <div
                    key={acc.id}
                    className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
                      isDark ? 'bg-slate-900/40' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold flex items-center gap-2">
                        <span>{acc.fullName}</span>
                        {isCurrent && (
                          <span className="text-[11px] font-semibold text-emerald-600">
                            · Đang đăng nhập
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                        {acc.email} · {acc.company} ({acc.jobTitle}) · ĐT: {acc.phone}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isCurrent ? (
                        <button
                          type="button"
                          onClick={() => onSwitchAccount(acc)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                        >
                          Đăng nhập tài khoản này
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-md">
                          Đang hoạt động
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
