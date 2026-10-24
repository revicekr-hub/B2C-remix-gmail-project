import React from 'react';
import { AlertTriangle, Send, X, Check } from 'lucide-react';

interface ConfirmSendModalProps {
  isOpen: boolean;
  to: string;
  subject: string;
  brandName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSending: boolean;
}

export const ConfirmSendModal: React.FC<ConfirmSendModalProps> = ({
  isOpen,
  to,
  subject,
  brandName,
  onConfirm,
  onCancel,
  isSending,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200 text-amber-900">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Xác nhận gửi email qua Gmail</h3>
            <p className="text-xs text-amber-800">Thao tác này sẽ gửi thư thật từ tài khoản của bạn</p>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-3 text-xs text-gray-700">
          <p>
            Bạn có chắc chắn muốn gửi chiến dịch email này với quyền từ tài khoản Google của bạn không?
          </p>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1.5 font-medium">
            <div className="flex">
              <span className="w-20 text-gray-500">Người nhận:</span>
              <span className="font-semibold text-gray-900 truncate">{to || 'Chưa điền người nhận'}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-500">Thương hiệu:</span>
              <span className="font-semibold text-gray-900">{brandName}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-500">Tiêu đề:</span>
              <span className="font-semibold text-gray-900 truncate">{subject}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 italic">
            Email sau khi gửi sẽ xuất hiện trong mục "Đã gửi" của hộp thư Gmail thật.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-gray-50 border-t border-gray-200 text-xs">
          <button
            onClick={onCancel}
            disabled={isSending}
            className="px-4 py-2 font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className="flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 active:scale-95"
          >
            {isSending ? (
              <span>Đang gửi qua Gmail...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Xác nhận gửi ngay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
