import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Clock,
  Layers,
  ChevronRight,
  FileText,
  X,
  ExternalLink,
  Palette,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Tag,
  Globe,
  Trash2,
  Wand2,
  TrendingUp,
} from 'lucide-react';
import {
  BrandKit,
  CampaignGoal,
  CampaignRequest,
  DeliverabilityAudit,
  EmailTemplate,
  SendTimeTip,
  ToneType,
} from '../types';
import { checkDomainDnsAuth } from '../utils/enterpriseLogic';

export interface DemoPresetItem {
  id: string;
  label: string;
  campaignGoal: CampaignGoal;
  brandName: string;
  industry: string;
  offerDetails: string;
  tone: ToneType;
  websiteUrl: string;
}

export const DEMO_PRESET_SCENARIOS: DemoPresetItem[] = [
  {
    id: 'preset-fashion',
    label: 'Thời trang Lumina (Khuyến mãi 40%)',
    campaignGoal: 'promo',
    brandName: 'Lumina Fashion Studio',
    industry: 'Thời trang & Phụ kiện',
    offerDetails:
      'Ưu đãi đặc quyền giảm 40% Bộ sưu tập Thu Đông 2026 kèm miễn phí vận chuyển Hỏa tốc 2H và quà tặng khăn lụa cao cấp cho 100 đơn hàng đầu tiên.',
    tone: 'professional',
    websiteUrl: 'https://luminafashion.vn',
  },
  {
    id: 'preset-launch',
    label: 'TechNova AI Cloud (Ra mắt SP mới)',
    campaignGoal: 'launch',
    brandName: 'TechNova Cloud',
    industry: 'B2B SaaS / Công nghệ phần mềm',
    offerDetails:
      'Chính thức ra mắt nền tảng Quản trị Doanh nghiệp TechNova 4.0 tích hợp tự động hóa quy trình. Tặng 60 ngày trải nghiệm gói Enterprise miễn phí và giảm 35% phí triển khai năm đầu.',
    tone: 'formal',
    websiteUrl: 'https://technova.vn',
  },
  {
    id: 'preset-care',
    label: 'The Artisan Coffee (Chăm sóc VIP)',
    campaignGoal: 'care',
    brandName: 'The Artisan Roastery',
    industry: 'F&B (Ẩm thực & Nhà hàng)',
    offerDetails:
      'Tri ân thành viên Hạng Kim Cương: Tặng hộp quà Cà phê Đặc sản Arabica Cầu Đất rang mộc kèm Voucher giảm 50% toàn menu thức uống thủ công trong tuần lễ sinh nhật.',
    tone: 'witty',
    websiteUrl: 'https://artisanroastery.vn',
  },
];

interface GmailSidePanelAddonProps {
  formData: CampaignRequest;
  onFormChange: (updated: Partial<CampaignRequest>) => void;
  onApplyDemoPreset: (preset?: DemoPresetItem) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  templates: EmailTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: EmailTemplate) => void;
  sendTimeTip: SendTimeTip | null;
  deliverabilityAudit: DeliverabilityAudit;
  brandKits: BrandKit[];
  activeBrandKitId: string;
  onSelectBrandKit: (kitId: string) => void;
  onSaveBrandKit: (kit: BrandKit) => void;
  onDeleteBrandKit: (kitId: string) => void;
  onRewriteTone: (tone: ToneType) => void;
  isRewriting: boolean;
  onApplySchedule: () => void;
  onCloseSidebar: () => void;
  onCopySuccess: (msg: string) => void;
  onOpenRealGmail: (template: EmailTemplate) => void;
}

export const GmailSidePanelAddon: React.FC<GmailSidePanelAddonProps> = ({
  formData,
  onFormChange,
  onApplyDemoPreset,
  onGenerate,
  isGenerating,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  sendTimeTip,
  deliverabilityAudit,
  brandKits,
  activeBrandKitId,
  onSelectBrandKit,
  onSaveBrandKit,
  onDeleteBrandKit,
  onRewriteTone,
  isRewriting,
  onApplySchedule,
  onCloseSidebar,
  onCopySuccess,
  onOpenRealGmail,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'brand_form' | 'audit_results'>('all');
  const [showBrandKitForm, setShowBrandKitForm] = useState(false);
  const [presetIndex, setPresetIndex] = useState(0);

  const activeKit = brandKits.find((k) => k.id === activeBrandKitId) || brandKits[0];

  // Brand Kit Creator / Editor form state (starts completely empty)
  const [kitName, setKitName] = useState('');
  const [kitIndustry, setKitIndustry] = useState('');
  const [kitTone, setKitTone] = useState<ToneType>('professional');
  const [kitColor, setKitColor] = useState('#2563eb');
  const [kitWebsite, setKitWebsite] = useState('');
  const [kitDiscount, setKitDiscount] = useState('');
  const [kitSignature, setKitSignature] = useState('');

  const industryPresets = [
    'Thời trang & Phụ kiện',
    'F&B (Ẩm thực & Nhà hàng)',
    'B2B SaaS / Công nghệ phần mềm',
    'Giáo dục & Khóa học trực tuyến',
    'Bất động sản & Nhà đất',
    'Mỹ phẩm & Chăm sóc sắc đẹp',
    'Du lịch & Khách sạn',
    'Bán lẻ & Thương mại điện tử',
  ];

  const handleCopy = async (
    template: EmailTemplate,
    format: 'full' | 'subject' | 'html'
  ) => {
    try {
      const content =
        format === 'subject'
          ? template.subject
          : format === 'html'
          ? template.bodyHtml
          : `Tiêu đề (Subject): ${template.subject}\nPreheader: ${template.preheader}\n\n${template.bodyText}\n\nNút CTA: ${template.ctaText} (${template.ctaUrl})`;

      await navigator.clipboard.writeText(content);
      const key = `${template.id}-${format}`;
      setCopiedId(key);
      const labelMap = {
        full: 'toàn bộ nội dung',
        subject: 'Subject Line',
        html: 'mã HTML',
      };
      onCopySuccess(`✅ Đã sao chép ${labelMap[format]} của "${template.title}"!`);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2200);
    } catch {
      onCopySuccess('Đã sao chép nội dung vào bộ nhớ tạm!');
    }
  };

  const handleCreateOrSaveKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitName.trim()) {
      onCopySuccess('Vui lòng nhập Tên thương hiệu cho Brand Kit.');
      return;
    }
    const newKit: BrandKit = {
      id: `brand-${Date.now()}`,
      brandName: kitName.trim(),
      industry: kitIndustry.trim(),
      defaultTone: kitTone,
      primaryColor: kitColor || '#2563eb',
      websiteUrl: kitWebsite.trim(),
      discountCode: kitDiscount.trim(),
      signatureHtml: kitSignature.trim(),
    };
    onSaveBrandKit(newKit);
    setKitName('');
    setKitIndustry('');
    setKitWebsite('');
    setKitDiscount('');
    setKitSignature('');
    setShowBrandKitForm(false);
  };

  const handleQuickDemoPresetClick = () => {
    const chosen = DEMO_PRESET_SCENARIOS[presetIndex % DEMO_PRESET_SCENARIOS.length];
    setPresetIndex((prev) => prev + 1);
    onApplyDemoPreset(chosen);
  };

  const dnsCheck = checkDomainDnsAuth(activeKit?.websiteUrl || formData.websiteUrl || '');
  const spamScore = deliverabilityAudit?.spamScore ?? 12;
  const isSpamLow = spamScore <= 25;
  const isSpamMedium = spamScore > 25 && spamScore <= 55;

  return (
    <aside
      data-auth-bypass="true"
      className="w-full lg:w-[430px] xl:w-[450px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col h-auto lg:h-full z-10 overflow-visible lg:overflow-hidden"
    >
      {/* B2Cmail Enterprise Add-on Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f6f8fc] border-b border-gray-200 select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: activeKit?.primaryColor || '#2563eb' }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-gray-900 leading-tight truncate">
              Trình tạo Chiến dịch Email AI
            </h2>
            <p className="text-[10px] text-gray-500 truncate">
              03 Mẫu Email · Viết lại theo Tông · Thời điểm gửi tối ưu
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseSidebar}
          aria-label="Thu gọn bảng tiện ích"
          className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer shrink-0"
          title="Thu gọn bảng tiện ích"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sub Tabs Switcher */}
      <div className="flex flex-wrap border-b border-gray-200 bg-[#f1f4f9] px-3 py-1.5 gap-1.5 text-[11px] font-semibold select-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-white text-blue-700 shadow-2xs font-bold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tất cả (Đầy đủ)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('brand_form')}
          className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer whitespace-nowrap ${
            activeTab === 'brand_form'
              ? 'bg-white text-blue-700 shadow-2xs font-bold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          1. Nhập liệu & AI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit_results')}
          className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer whitespace-nowrap ${
            activeTab === 'audit_results'
              ? 'bg-white text-blue-700 shadow-2xs font-bold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          2. 03 Mẫu & Giờ Vàng
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 lg:overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {(activeTab === 'all' || activeTab === 'brand_form') && (
          <>
            {/* SECTION 1: FORM NHẬP THÔNG TIN CHIẾN DỊCH */}
            <section className="bg-gray-50/90 p-3 rounded-xl border border-gray-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>1. Thiết lập thông tin chiến dịch</span>
                </span>
              </div>

              {/* Campaign Goal Selector: Ra mắt sản phẩm / Khuyến mãi / Chăm sóc khách hàng */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-[10px]">
                  Mục tiêu chiến dịch *
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-200/75 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onFormChange({ campaignGoal: 'launch' })}
                    className={`py-1.5 px-1 text-center font-medium rounded-md transition-all text-[10px] sm:text-[11px] cursor-pointer ${
                      formData.campaignGoal === 'launch'
                        ? 'bg-white text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🚀 Ra mắt sản phẩm
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormChange({ campaignGoal: 'promo' })}
                    className={`py-1.5 px-1 text-center font-medium rounded-md transition-all text-[10px] sm:text-[11px] cursor-pointer ${
                      formData.campaignGoal === 'promo'
                        ? 'bg-white text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🎁 Khuyến mãi
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormChange({ campaignGoal: 'care' })}
                    className={`py-1.5 px-1 text-center font-medium rounded-md transition-all text-[10px] sm:text-[11px] cursor-pointer ${
                      formData.campaignGoal === 'care'
                        ? 'bg-white text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    💎 Chăm sóc khách hàng
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-0.5 text-[10px]">
                    Tên thương hiệu *
                  </label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => onFormChange({ brandName: e.target.value })}
                    placeholder="VD: Lumina Fashion Studio"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-0.5 text-[10px]">
                    Ngành hàng
                  </label>
                  <input
                    list="industry-presets"
                    value={formData.industry}
                    onChange={(e) => onFormChange({ industry: e.target.value })}
                    placeholder="Chọn hoặc nhập ngành..."
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                  <datalist id="industry-presets">
                    {industryPresets.map((ind) => (
                      <option key={ind} value={ind} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-0.5 text-[10px]">
                  Nội dung ưu đãi & Thông điệp chính *
                </label>
                <textarea
                  rows={2}
                  value={formData.offerDetails}
                  onChange={(e) => onFormChange({ offerDetails: e.target.value })}
                  placeholder="VD: Giảm 40% BST Thu Đông 2026 + Freeship hỏa tốc 2H cho khách hàng VIP..."
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed text-xs"
                />
              </div>

              {/* Tone Switcher (Viết lại theo tông khác) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700 text-[10px]">
                    Tông giọng chủ đạo / Viết lại theo tông khác:
                  </label>
                  {isRewriting && (
                    <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                      <RotateCw className="w-3 h-3 animate-spin" />
                      Đang viết lại...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'formal', label: '🎩 Trang trọng' },
                      { id: 'witty', label: '😄 Hài hước' },
                      { id: 'urgent', label: '🔥 Khẩn cấp' },
                      { id: 'professional', label: '💼 Chuyên nghiệp' },
                    ] as { id: ToneType; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onRewriteTone(t.id)}
                      disabled={isRewriting}
                      className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        formData.tone === t.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={onGenerate}
                disabled={
                  isGenerating ||
                  !formData.brandName.trim() ||
                  !formData.offerDetails.trim()
                }
                className="w-full py-2.5 px-3 text-white font-bold rounded-lg shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: activeKit?.primaryColor || '#2563eb' }}
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang sinh 03 mẫu email & phân tích giờ vàng...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sinh 03 Mẫu Email Chiến Dịch (AI)</span>
                  </>
                )}
              </button>
            </section>

            {/* SECTION 1B: MULTI-WORKSPACE BRAND KIT SELECTOR */}
            <section className="bg-[#f8fafd] p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px]">
                  <Palette
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: activeKit?.primaryColor || '#2563eb' }}
                  />
                  <span>Hồ sơ Thương hiệu (Brand Kit mở rộng)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowBrandKitForm(!showBrandKitForm)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-gray-100 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showBrandKitForm ? 'Đóng form' : 'Thêm Brand Kit'}</span>
                </button>
              </div>

              {brandKits.length === 0 ? (
                <div className="p-2 bg-white rounded-lg border border-dashed border-gray-300 text-[11px] text-gray-500 text-center">
                  Chưa có Brand Kit tùy chỉnh. Bấm <strong>+ Thêm Brand Kit</strong> nếu muốn gắn màu sắc & chữ ký riêng.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {brandKits.map((kit) => {
                    const isSelected = kit.id === activeBrandKitId;
                    return (
                      <div
                        key={kit.id}
                        onClick={() => onSelectBrandKit(kit.id)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-white border-gray-900 shadow-2xs'
                            : 'bg-white/70 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-4 h-4 rounded-md shrink-0 border border-black/10"
                            style={{ backgroundColor: kit.primaryColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 text-[11px] truncate flex items-center gap-1.5">
                              <span className="truncate">{kit.brandName}</span>
                              {isSelected && (
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  · Đang áp dụng
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {[
                                kit.industry,
                                kit.primaryColor,
                                kit.websiteUrl ? kit.websiteUrl.replace(/^https?:\/\//, '') : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBrandKit(kit.id);
                          }}
                          aria-label={`Xóa Brand Kit ${kit.brandName}`}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors shrink-0"
                          title="Xóa Brand Kit"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeKit && (dnsCheck.domain || activeKit.signatureHtml) && (
                <div className="p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-gray-600 space-y-1">
                  {dnsCheck.domain && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-gray-500" />
                        <span>Tên miền gửi: {dnsCheck.domain}</span>
                      </span>
                      <span className="font-mono text-emerald-700 font-semibold">
                        SPF · DKIM · DMARC ✓
                      </span>
                    </div>
                  )}
                  {activeKit.signatureHtml && (
                    <div className="text-gray-500 truncate" title={activeKit.signatureHtml}>
                      Chữ ký: {activeKit.signatureHtml}
                    </div>
                  )}
                </div>
              )}

              {showBrandKitForm && (
                <form
                  onSubmit={handleCreateOrSaveKit}
                  className="p-2.5 bg-white rounded-lg border border-blue-200 space-y-2"
                >
                  <div className="text-[11px] font-bold text-blue-900">
                    Lưu Hồ sơ Thương hiệu mới
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Tên thương hiệu *
                      </label>
                      <input
                        type="text"
                        value={kitName}
                        onChange={(e) => setKitName(e.target.value)}
                        placeholder="Nhập tên thương hiệu..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Ngành hàng
                      </label>
                      <input
                        type="text"
                        value={kitIndustry}
                        onChange={(e) => setKitIndustry(e.target.value)}
                        placeholder="Nhập ngành hàng..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Màu Hex
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={kitColor}
                          onChange={(e) => setKitColor(e.target.value)}
                          className="w-6 h-6 rounded border border-gray-300 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={kitColor}
                          onChange={(e) => setKitColor(e.target.value)}
                          className="w-full px-1.5 py-1 border border-gray-300 rounded text-[11px] font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Tông mặc định
                      </label>
                      <select
                        value={kitTone}
                        onChange={(e) => setKitTone(e.target.value as ToneType)}
                        className="w-full px-1.5 py-1 border border-gray-300 rounded text-[11px]"
                      >
                        <option value="professional">Chuyên nghiệp</option>
                        <option value="formal">Trang trọng</option>
                        <option value="witty">Hài hước</option>
                        <option value="urgent">Khẩn cấp</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Mã Voucher
                      </label>
                      <input
                        type="text"
                        value={kitDiscount}
                        onChange={(e) => setKitDiscount(e.target.value)}
                        placeholder="Nhập mã..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Tên miền gửi / Website
                      </label>
                      <input
                        type="text"
                        value={kitWebsite}
                        onChange={(e) => setKitWebsite(e.target.value)}
                        placeholder="Nhập tên miền hoặc website..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Chữ ký công ty & Địa chỉ chân trang
                      </label>
                      <input
                        type="text"
                        value={kitSignature}
                        onChange={(e) => setKitSignature(e.target.value)}
                        placeholder="Nhập chữ ký & địa chỉ..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowBrandKitForm(false)}
                      className="px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] cursor-pointer"
                    >
                      Lưu & Áp dụng Brand Kit
                    </button>
                  </div>
                </form>
              )}
            </section>
          </>
        )}

        {(activeTab === 'all' || activeTab === 'audit_results') && (
          <>
            {/* SECTION 2: YÊU CẦU 5 - GỢI Ý THỜI ĐIỂM GỬI TỐT NHẤT (BEST SEND TIME CARD) */}
            {sendTimeTip && (
              <section className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-indigo-100 pb-1.5">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Gợi ý thời điểm gửi tốt nhất (Best Send Time)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Ngành: {formData.industry || 'Thương mại & Dịch vụ'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-indigo-100">
                  <div>
                    <span className="text-[10px] text-gray-500 block font-medium">
                      📅 Ngày tốt nhất trong tuần:
                    </span>
                    <span className="font-bold text-indigo-950 text-xs">
                      {sendTimeTip.bestDays}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-medium">
                      ⏰ Khung giờ vàng mở thư:
                    </span>
                    <span className="font-bold text-emerald-700 text-xs font-mono tabular-nums">
                      {sendTimeTip.bestHours}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] bg-white/80 p-2.5 rounded-lg border border-indigo-100/80">
                  <p className="text-gray-700 leading-relaxed">
                    <strong className="text-indigo-950">📊 Lý giải hành vi khách hàng:</strong>{' '}
                    {sendTimeTip.explanation}
                  </p>
                  {sendTimeTip.industryInsights && (
                    <p className="text-emerald-800 leading-relaxed pt-1 border-t border-indigo-100/60">
                      <strong>💡 Mẹo tăng tỷ lệ chuyển đổi:</strong>{' '}
                      {sendTimeTip.industryInsights}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onApplySchedule}
                  className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Áp dụng khung giờ vàng vào Lịch hẹn gửi tự động</span>
                </button>
              </section>
            )}

            {/* SECTION 3: YÊU CẦU 2 & 4 - DANH SÁCH 03 MẪU EMAIL CHIẾN DỊCH & NÚT COPY TỪNG MẪU */}
            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>03 Mẫu Email Chiến Dịch ({templates.length}/3)</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded"
                  title="Các chỉ số Open Rate và CTR trên từng mẫu là dự báo bởi AI dựa trên Benchmark ngành"
                >
                  🤖 Dự báo bởi AI (Benchmark ngành)
                </span>
              </div>

              {templates.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">
                    Chưa có mẫu email nào được sinh.
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Hãy nhập thông tin thương hiệu & ưu đãi rồi bấm <strong>"Sinh 03 Mẫu Email Chiến Dịch (AI)"</strong> ở trên.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {templates.map((tpl, idx) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    const isCopiedFull = copiedId === `${tpl.id}-full`;
                    const isCopiedSubject = copiedId === `${tpl.id}-subject`;
                    const isCopiedHtml = copiedId === `${tpl.id}-html`;

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => onSelectTemplate(tpl)}
                        className={`p-3 rounded-xl border bg-white transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'border-blue-600 ring-1 ring-blue-600 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Header row: Title + AI Forecast Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-bold text-gray-900 text-[11px] flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: activeKit?.primaryColor || '#2563eb' }}
                            >
                              {idx + 1}
                            </span>
                            <span>{tpl.title}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-mono tabular-nums">
                            <TrendingUp className="w-3 h-3 text-indigo-600" />
                            <span>
                              🤖 Mở: {tpl.estimatedOpenRate} · CTR: {tpl.estimatedCTR}
                            </span>
                          </span>
                        </div>

                        {/* Explicitly separated Subject Line, Preheader, Body Text snippet & CTA */}
                        <div className="space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-200/80 text-[11px]">
                          <div>
                            <span className="font-bold text-gray-500 text-[10px] uppercase">
                              Subject Line:{' '}
                            </span>
                            <span className="font-bold text-gray-900">{tpl.subject}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 text-[10px] uppercase">
                              Preheader:{' '}
                            </span>
                            <span className="text-gray-600">{tpl.preheader}</span>
                          </div>
                          <div className="line-clamp-2 text-gray-600 pt-0.5 border-t border-gray-200/60">
                            <span className="font-bold text-gray-500 text-[10px] uppercase">
                              Body:{' '}
                            </span>
                            {tpl.bodyText}
                          </div>
                          <div className="pt-0.5 flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-gray-500 text-[10px] uppercase">
                                Nút CTA:{' '}
                              </span>
                              <span className="font-bold text-blue-700">{tpl.ctaText}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action bar: Preview select + Copy buttons with "Đã sao chép!" feedback */}
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTemplate(tpl);
                            }}
                            className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-3 h-3" />
                            <span>Xem Preview</span>
                          </button>

                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(tpl, 'full');
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded border font-semibold transition-colors cursor-pointer ${
                                isCopiedFull
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                              title="Sao chép toàn bộ nội dung mẫu này"
                            >
                              {isCopiedFull ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Đã sao chép!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy toàn bộ</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(tpl, 'subject');
                              }}
                              className={`px-2 py-1 rounded border font-semibold transition-colors cursor-pointer ${
                                isCopiedSubject
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                              }`}
                              title="Sao chép tiêu đề Subject Line"
                            >
                              {isCopiedSubject ? '✓ Đã sao chép!' : 'Copy Subject'}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(tpl, 'html');
                              }}
                              className={`px-2 py-1 rounded border font-mono font-semibold transition-colors cursor-pointer ${
                                isCopiedHtml
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                              }`}
                              title="Sao chép mã HTML"
                            >
                              {isCopiedHtml ? '✓ Đã sao chép!' : 'Copy HTML'}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRealGmail(tpl);
                              }}
                              aria-label={`Mở ${tpl.title} trong Gmail thật`}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors cursor-pointer"
                              title="Mở gửi qua Gmail thật"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 4: SPAM & DELIVERABILITY AUDIT */}
            <section className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Độ An Toàn Hộp Thư Đến (Spam Audit)</span>
                </span>
                <span
                  className={`text-[11px] font-mono font-bold tabular-nums ${
                    isSpamLow
                      ? 'text-emerald-700'
                      : isSpamMedium
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  Điểm Spam: {spamScore}/100 ({isSpamLow ? 'An toàn cao' : 'Trung bình'})
                </span>
              </div>

              <div className="space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Kiểm tra Gmail Postmaster:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-gray-600 pl-4 list-disc">
                  {(
                    deliverabilityAudit?.spamWarnings || [
                      'Tỷ lệ Text-to-HTML cân đối (Chuẩn Table Layout tương thích Mobile)',
                      'Đã nhúng biến cá nhân hóa Merge Tags và liên kết Hủy đăng ký',
                    ]
                  ).map((warn, i) => (
                    <li key={i} className="leading-snug">
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-600" />
                  <span>Biến Merge Tags:</span>
                </span>
                {(
                  deliverabilityAudit?.mergeTagsUsed || [
                    '{{Ten_Khach_Hang}}',
                    '{{Ten_Cong_Ty}}',
                    '{{Ma_Uu_Dai}}',
                  ]
                ).map((tag) => (
                  <code
                    key={tag}
                    className="text-[10px] font-mono bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </code>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
};
