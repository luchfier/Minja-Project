import React from 'react';
import { FilterPreset } from '../../types/editor';
import { Wand2 } from 'lucide-react';

export interface FilterBarProps {
  activeFilter: FilterPreset;
  onSelectFilter: (filter: FilterPreset) => void;
  className?: string;
}

const filters: { id: FilterPreset; label: string; previewColor: string }[] = [
  { id: 'normal', label: 'Original', previewColor: 'from-slate-700 to-slate-800' },
  { id: 'bw', label: 'B & W', previewColor: 'from-neutral-900 to-neutral-400' },
  { id: 'sepia', label: 'Vintage Sepia', previewColor: 'from-amber-900 to-amber-600' },
  { id: 'warm', label: 'Warm Sun', previewColor: 'from-orange-800 to-amber-500' },
  { id: 'cool', label: 'Cool Blue', previewColor: 'from-blue-900 to-cyan-500' },
  { id: 'glamour', label: 'Glamour Glow', previewColor: 'from-rose-900 to-pink-500' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  onSelectFilter,
  className = '',
}) => {
  return (
    <div className={`glass-panel rounded-2xl p-4 border border-white/10 select-none ${className}`}>
      <div className="flex items-center gap-2 mb-3 px-0.5 text-xs font-bold text-slate-300">
        <Wand2 className="w-4 h-4 text-amber-400" />
        <span>Filter Warna Studio</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto p-2 rounded-xl bg-black/25 border border-white/5 custom-scrollbar">
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFilter(f.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-150 touch-manipulation active:scale-95 ${
                isActive
                  ? 'bg-amber-500/20 border-2 border-amber-400 shadow-glow-primary'
                  : 'glass-panel hover:bg-white/5 border border-white/10'
              }`}
            >
              <div
                className={`w-14 h-10 rounded-lg bg-gradient-to-tr ${f.previewColor} border border-white/20 shadow-inner`}
              />
              <span
                className={`text-[11px] font-bold ${
                  isActive ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {f.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
