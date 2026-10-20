import React from 'react';
import { Layout } from 'lucide-react';
import { TemplateItem } from '../../types/template';

export interface TemplateSelectorProps {
  templates: TemplateItem[];
  selectedTemplateId: string;
  onSelectTemplate: (template: TemplateItem) => void;
  className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  className = '',
}) => {
  return (
    <div className={`glass-panel rounded-2xl p-4 border border-white/10 select-none ${className}`}>
      <div className="flex items-center gap-2 mb-3 px-0.5 text-xs font-bold text-slate-300">
        <Layout className="w-4 h-4 text-amber-400" />
        <span>Pilihan Layout Bingkai Cetak</span>
      </div>

      <div className="flex gap-3.5 overflow-x-auto p-2 rounded-xl bg-black/25 border border-white/5 custom-scrollbar">
        {templates.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectTemplate(tpl)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all duration-150 touch-manipulation active:scale-95 ${
                isSelected
                  ? 'bg-amber-500/20 border-2 border-amber-400 shadow-glow-primary'
                  : 'glass-panel hover:bg-white/5 border border-white/10'
              }`}
            >
              {/* Template Thumbnail Representation */}
              <div className="w-20 h-28 rounded-xl bg-slate-900 border border-white/15 p-1 flex flex-col gap-1 justify-center items-center overflow-hidden relative">
                {tpl.frameUrl && tpl.frameUrl.trim().length > 0 ? (
                  <img
                    src={tpl.frameUrl}
                    alt={tpl.name}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  tpl.slots.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="w-full bg-slate-700/80 rounded-md border border-white/10 flex items-center justify-center text-[9px] font-bold text-amber-400"
                      style={{ height: `${100 / tpl.slots.length - 8}%` }}
                    >
                      #{idx + 1}
                    </div>
                  ))
                )}
              </div>

              <div className="text-center">
                <span
                  className={`text-[11px] font-black block truncate max-w-[90px] ${
                    isSelected ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {tpl.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {tpl.slots.length} Foto
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
