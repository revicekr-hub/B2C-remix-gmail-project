import React from 'react';
import {
  Square,
  RefreshCw,
  Star,
  Inbox,
  Tag,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { EmailTemplate } from '../types';

interface GmailInboxListProps {
  templates: EmailTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: EmailTemplate) => void;
  brandName: string;
}

export const GmailInboxList: React.FC<GmailInboxListProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  brandName,
}) => {
  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Unified Compact Inbox Header + Tabs */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-200 bg-[#f8fafc] text-gray-600 text-[11px] shrink-0">
        <div className="flex items-center gap-2">
          <button className="p-0.5 hover:bg-gray-200 rounded text-gray-500" title="Chọn tất cả">
            <Square className="w-3.5 h-3.5" />
          </button>
          <button className="p-0.5 hover:bg-gray-200 rounded text-gray-500" title="Làm mới">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1 font-semibold">
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-white text-blue-700 border border-gray-200 shadow-2xs">
              <Inbox className="w-3 h-3 text-blue-600" />
              <span>Chính</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-200">
              <Tag className="w-3 h-3 text-emerald-600" />
              <span>Khuyến mãi (3 mẫu AI)</span>
            </span>
          </div>
        </div>

        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 text-[10px]">
          <Sparkles className="w-3 h-3 text-blue-600" />
          So sánh Subject & Preheader của 03 Mẫu trong Hộp thư đến
        </span>
      </div>

      {/* 3 AI Templates Inbox Rows */}
      <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
        {templates.map((tpl, index) => {
          const isSelected = tpl.id === selectedTemplateId;
          const badgeColors = [
            'bg-blue-100 text-blue-800 border-blue-200',
            'bg-emerald-100 text-emerald-800 border-emerald-200',
            'bg-rose-100 text-rose-800 border-rose-200',
          ];

          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl)}
              className={`group flex items-center px-3 py-1 text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-50/90 font-semibold shadow-2xs'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {/* Checkbox & Star */}
              <div className="flex items-center gap-1.5 shrink-0 mr-2 text-gray-400">
                <Square className="w-3.5 h-3.5 hover:text-gray-600" />
                <Star className="w-3.5 h-3.5 hover:text-amber-500 fill-amber-100 text-amber-400" />
              </div>

              {/* Sender Name with Template Index Badge */}
              <div className="w-36 shrink-0 font-bold text-gray-900 truncate flex items-center gap-1">
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                    badgeColors[index % badgeColors.length]
                  }`}
                >
                  Mẫu {index + 1}
                </span>
                <span className="truncate">{brandName || 'Thương hiệu'}</span>
              </div>

              {/* Subject Line & Preheader Snippet - Exactly like Gmail Inbox */}
              <div className="flex-1 min-w-0 pr-3 flex items-baseline gap-1.5">
                <span className="font-bold text-gray-900 truncate shrink-0 max-w-[44%] text-[11px]">
                  {tpl.subject}
                </span>
                <span className="text-gray-400 shrink-0 font-normal">-</span>
                <span className="text-gray-500 truncate font-normal text-[11px]">
                  {tpl.preheader}
                </span>
              </div>

              {/* Angle & Open Rate tags */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded-full border border-indigo-200">
                  <TrendingUp className="w-3 h-3" />
                  Mở: {tpl.estimatedOpenRate}
                </span>

                {/* Quick Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(tpl);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors cursor-pointer"
                >
                  <span>Chèn soạn thư</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
