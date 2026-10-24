import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  FileCode,
  Chrome,
  Download,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Terminal,
  Image as ImageIcon,
} from 'lucide-react';
import {
  EXTENSION_MANIFEST_JSON,
  EXTENSION_CONTENT_JS,
  APPS_SCRIPT_CODE_GS,
} from '../data/extensionAssets';

interface ExtensionInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopySuccess: (msg: string) => void;
}

export const ExtensionInstallModal: React.FC<ExtensionInstallModalProps> = ({
  isOpen,
  onClose,
  onCopySuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'content' | 'appscript' | 'guide'>('manifest');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = async (fileName: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      onCopySuccess(`Đã sao chép ${fileName} vào bộ nhớ tạm!`);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      // fallback
    }
  };

  const downloadFile = (fileName: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onCopySuccess(`Đã tải xuống tệp ${fileName}!`);
  };

  const downloadBothExtensionFiles = () => {
    downloadFile('manifest.json', EXTENSION_MANIFEST_JSON, 'application/json');
    setTimeout(() => {
      downloadFile('content.js', EXTENSION_CONTENT_JS, 'text/javascript');
      onCopySuccess('Đã tải trọn bộ 2 tệp manifest.json & content.js (Đã sửa lỗi icon)!');
    }, 350);
  };

  // Generate a real PNG icon using HTML5 Canvas in case user wants icon16.png
  const downloadGeneratedIconPng = (size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#2563eb');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, Math.max(3, Math.floor(size * 0.2)));
    ctx.fill();

    // Text "AI"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.52)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI', size / 2, size / 2 + 1);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `icon${size}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onCopySuccess(`Đã tải ảnh icon${size}.png chuẩn PNG!`);
    }, 'image/png');
  };

  const powershellQuickFix = `New-Item -ItemType Directory -Force -Path "D:\\gmail-ai-assistant" | Out-Null; Set-Content -Path "D:\\gmail-ai-assistant\\manifest.json" -Encoding UTF8 -Value '${EXTENSION_MANIFEST_JSON.replace(/\n/g, ' ')}'`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Chrome className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Gói Cài Đặt Chrome Extension & Apps Script Add-on (v1.2 - Đã Fix Lỗi Icon)
              </h2>
              <p className="text-xs text-gray-500">
                Chỉ cần đúng 2 tệp manifest.json và content.js — Không cần thư mục icons/icon16.png
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadBothExtensionFiles}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải cả 2 tệp (1-Click)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fixed Error Notice Banner */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Khắc phục lỗi "Could not load icon 'icons/icon16.png'":</strong> Tệp{' '}
              <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">manifest.json</code> mới bên dưới đã loại bỏ hoàn toàn thuộc tính <code className="font-mono">icons</code>. Bạn chỉ cần lưu đè vào <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">D:\gmail-ai-assistant\manifest.json</code> rồi bấm <strong>"Thử lại"</strong> trên Chrome!
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-100/70 px-6 gap-2 text-xs font-semibold pt-2">
          <button
            onClick={() => setActiveTab('manifest')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'manifest'
                ? 'border-purple-600 bg-white text-purple-700 shadow-2xs font-bold'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <FileCode className="w-4 h-4 text-amber-500" />
            <span>1. manifest.json (Đã sửa lỗi)</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'border-purple-600 bg-white text-purple-700 shadow-2xs font-bold'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Code2 className="w-4 h-4 text-blue-500" />
            <span>2. content.js (Sidebar trên Gmail)</span>
          </button>

          <button
            onClick={() => setActiveTab('appscript')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'appscript'
                ? 'border-purple-600 bg-white text-purple-700 shadow-2xs font-bold'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Code.gs (Apps Script Add-on)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 rounded-t-lg transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-purple-600 bg-white text-purple-700 shadow-2xs font-bold'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Hướng dẫn sửa lỗi 1 chạm</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {activeTab === 'manifest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    Tệp cấu hình Chrome Extension (manifest.json - Không yêu cầu file ảnh icon)
                  </h4>
                  <p className="text-gray-500 text-xs">
                    Sao chép hoặc tải tệp này đè lên tệp cũ trong thư mục <code className="font-mono text-purple-700 font-bold">D:\gmail-ai-assistant\manifest.json</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile('manifest.json', EXTENSION_MANIFEST_JSON, 'application/json')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải manifest.json</span>
                  </button>
                  <button
                    onClick={() => handleCopyCode('manifest.json', EXTENSION_MANIFEST_JSON)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    {copiedFile === 'manifest.json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFile === 'manifest.json' ? 'Đã sao chép' : 'Sao chép mã'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-gray-900 text-amber-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-gray-800 leading-relaxed">
                {EXTENSION_MANIFEST_JSON}
              </pre>

              {/* Optional PowerShell 1-second fixer for D:\gmail-ai-assistant */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Terminal className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-800">
                      Mẹo tự động cập nhật <code className="font-mono text-indigo-700">D:\gmail-ai-assistant\manifest.json</code> bằng PowerShell:
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Bấm nút bên phải để chép lệnh PowerShell, dán vào cửa sổ PowerShell trên Windows là tệp <code className="font-mono">manifest.json</code> tự động được sửa lỗi ngay!
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyCode('Lệnh PowerShell sửa lỗi', powershellQuickFix)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  {copiedFile === 'Lệnh PowerShell sửa lỗi' ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                  <span>Chép lệnh tự sửa</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    Tệp content.js - Tích hợp bảng điều khiển AI & tự động điền vào Gmail thật
                  </h4>
                  <p className="text-gray-500 text-xs">
                    Tự động gắn nút <strong className="text-purple-700">✨ AI Campaign</strong> cạnh nút Gửi trong Gmail thật và mở bảng chọn 3 mẫu thư
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile('content.js', EXTENSION_CONTENT_JS, 'text/javascript')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải content.js</span>
                  </button>
                  <button
                    onClick={() => handleCopyCode('content.js', EXTENSION_CONTENT_JS)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    {copiedFile === 'content.js' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFile === 'content.js' ? 'Đã sao chép' : 'Sao chép mã'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-gray-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-gray-800 leading-relaxed max-h-[340px]">
                {EXTENSION_CONTENT_JS}
              </pre>
            </div>
          )}

          {activeTab === 'appscript' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Google Workspace Add-on (Code.gs)</h4>
                  <p className="text-gray-500 text-xs">Chạy trực tiếp trong thanh bên phải của Gmail trên máy tính và điện thoại</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile('Code.gs', APPS_SCRIPT_CODE_GS, 'text/plain')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải tệp</span>
                  </button>
                  <button
                    onClick={() => handleCopyCode('Code.gs', APPS_SCRIPT_CODE_GS)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    {copiedFile === 'Code.gs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFile === 'Code.gs' ? 'Đã sao chép' : 'Sao chép mã'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-gray-900 text-sky-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-gray-800 leading-relaxed max-h-[340px]">
                {APPS_SCRIPT_CODE_GS}
              </pre>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 max-w-2xl text-gray-700 text-xs">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <h4 className="font-bold text-emerald-950 text-sm mb-1">
                  Cách khắc phục lỗi "Could not load icon 'icons/icon16.png'" trong 10 giây:
                </h4>
                <p className="text-emerald-800 text-[11px]">
                  Lỗi trên Chrome xảy ra do tệp <code className="font-mono">manifest.json</code> cũ có khai báo <code className="font-mono">"icons": &#123; "16": "icons/icon16.png" &#125;</code> nhưng thư mục <code className="font-mono">D:\gmail-ai-assistant</code> chưa có thư mục con <code className="font-mono">icons</code>. Bản cập nhật v1.2 đã loại bỏ yêu cầu icon để nạp trực tiếp chỉ với 2 tệp!
                </p>
              </div>

              <ol className="space-y-2.5 list-decimal list-inside font-medium leading-relaxed">
                <li className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <strong className="text-gray-900">Bước 1: Ghi đè manifest.json:</strong> Bấm nút <strong>"Tải cả 2 tệp (1-Click)"</strong> ở góc trên cùng (hoặc sao chép mã ở tab <code className="text-purple-700 font-mono">1. manifest.json</code>) và lưu đè vào <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono">D:\gmail-ai-assistant\manifest.json</code>.
                </li>
                <li className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <strong className="text-gray-900">Bước 2: Bấm "Thử lại" trên Chrome:</strong> Quay lại hộp thoại đang báo lỗi trên <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono">chrome://extensions/</code> và bấm nút <strong>"Thử lại"</strong> màu xanh. Tiện ích sẽ được nạp thành công ngay lập tức!
                </li>
                <li className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                  <strong className="text-emerald-950">Bước 3: Mở Gmail thật:</strong> Truy cập <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">mail.google.com</a>, bấm <strong>"Soạn thư"</strong>, bạn sẽ thấy nút <strong>"✨ AI Campaign"</strong> nằm ngay cạnh nút Gửi!
                </li>
              </ol>

              {/* Optional icon download if user wants to keep icons folder */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-[11px] text-gray-600">
                    Tuỳ chọn thêm: Nếu bạn muốn giữ thư mục <code className="font-mono">icons/</code>, tải các ảnh PNG chuẩn tại đây:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {[16, 48, 128].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => downloadGeneratedIconPng(sz)}
                      className="px-2.5 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-[11px] font-semibold text-gray-700 cursor-pointer"
                    >
                      icon{sz}.png
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Tương thích 100% với Chrome, Edge, Brave, Cốc Cốc (Manifest V3)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 font-semibold text-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
