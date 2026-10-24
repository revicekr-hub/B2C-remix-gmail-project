import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Play,
  Sparkles,
  Wand2,
  X,
  Activity,
} from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunQuickDemoPreset: () => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onRunQuickDemoPreset,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: 'Bước 1',
      title: 'Nhập thông tin chiến dịch ở bảng công cụ bên phải',
      desc: 'Chọn Mục tiêu chiến dịch (Ra mắt sản phẩm / Khuyến mãi / Chăm sóc khách hàng), nhập Tên thương hiệu, Ngành hàng và Nội dung ưu đãi chính của chiến dịch.',
      icon: Wand2,
      badge: 'Yêu cầu 1',
    },
    {
      step: 'Bước 2',
      title: 'Bấm "Sinh 03 Mẫu Email" & So sánh 3 góc tiếp cận',
      desc: 'AI (Gemini 2.5 Flash / 2.0 Flash kèm cơ chế Fallback thông minh) sẽ lập tức sinh 03 mẫu email: Mẫu 1 (Trực diện & Lợi ích), Mẫu 2 (Kể chuyện & Cảm xúc), Mẫu 3 (Khẩn cấp FOMO) với đầy đủ Subject Line, Preheader, Body HTML chuẩn Mobile và nút CTA.',
      icon: Sparkles,
      badge: 'Yêu cầu 2',
    },
    {
      step: 'Bước 3',
      title: 'Xem Preview như Hộp thư thật (Chuyển đổi 💻 Desktop / 📱 Mobile)',
      desc: 'Quan sát trực quan cách cả 3 email hiển thị ngoài danh sách Inbox Gmail (Subject + Preheader) và khung mở đọc thư chi tiết (Avatar người gửi, thời gian, nội dung HTML, nút CTA). Bấm nút chuyển đổi 💻 Desktop / 📱 Mobile để kiểm tra giao diện responsive.',
      icon: Eye,
      badge: 'Yêu cầu 3',
    },
    {
      step: 'Bước 4',
      title: 'Thử nghiệm "Viết lại theo tông khác" & "Copy từng mẫu"',
      desc: 'Ngay trên thanh công cụ Preview, bấm các nút "🎩 Trang trọng", "😄 Hài hước", hoặc "🔥 Khẩn cấp" để viết lại toàn bộ 3 mẫu email theo cảm xúc mới. Bấm "Copy toàn bộ", "Copy Subject" hoặc "Copy HTML" để sao chép nhanh kèm phản hồi "Đã sao chép!".',
      icon: Copy,
      badge: 'Yêu cầu 4',
    },
    {
      step: 'Bước 5',
      title: 'Xem "Gợi ý thời điểm gửi tốt nhất" & Chạy Live Tracking Sandbox',
      desc: 'Xem thẻ phân tích Ngày vàng, Giờ vàng, Lý giải hành vi khách hàng theo ngành và Mẹo tăng chuyển đổi. Ngoài ra, hãy thử bấm "Chạy Gửi Mô Phỏng + Nhúng Pixel" để kiểm chứng phân tách minh bạch giữa "🤖 Dự báo bởi AI" và "🧪 Dữ liệu Mô phỏng Thực tế (Open Pixel 1x1, Click Redirect, Unsubscribe)".',
      icon: Clock,
      badge: 'Yêu cầu 5 & Mở rộng',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-guide-modal-title"
      data-auth-bypass="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="demo-guide-modal-title" className="text-sm sm:text-base font-bold truncate">
                📖 Hướng dẫn sử dụng & Kịch bản Demo (B2Cmail AI)
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Quy trình 5 bước kiểm thử trọn vẹn 100% tính năng cốt lõi & bộ công cụ Enterprise
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">

          {/* 5 Steps List */}
          <div className="space-y-2.5">
            {steps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.step}: {item.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Transparency Explanation Box */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2">
            <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Minh bạch hóa Dữ liệu (Phân biệt Dự báo AI & Dữ liệu Thực tế)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-slate-700">
                <span className="inline-block font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px] mb-1">
                  🤖 Dự báo bởi AI (Benchmark ngành)
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-snug">
                  Áp dụng cho chỉ số <strong>Estimated Open Rate</strong> & <strong>Estimated CTR</strong> trên từng mẫu email, ước tính dựa trên tiêu chuẩn ngành hàng và cấu trúc Subject/CTA.
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-slate-700">
                <span className="inline-block font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] mb-1">
                  🧪 Dữ liệu Mô phỏng Thực tế (Live Tracking Sandbox)
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-snug">
                  Áp dụng cho bộ đếm <strong>Đã gửi</strong>, <strong>Lượt mở (Open Pixel 1x1 GIF)</strong>, <strong>Lượt click CTA (302 Redirect)</strong> và <strong>Unsubscribe</strong> thực tế từ Backend API.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Sẵn sàng kiểm thử trên cả Desktop & Mobile</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Đã hiểu, bắt đầu trải nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
