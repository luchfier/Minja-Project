import React from 'react';
import { Sun, Contrast, RotateCw, RotateCcw } from 'lucide-react';
import { PhotoAdjustment } from '../../types/editor';

export interface AdjustmentSlidersProps {
  adjustments: PhotoAdjustment;
  onChange: (newAdj: Partial<PhotoAdjustment>) => void;
  className?: string;
}

export const AdjustmentSliders: React.FC<AdjustmentSlidersProps> = ({
  adjustments,
  onChange,
  className = '',
}) => {
  const handleRotate = (delta: number) => {
    const next = (adjustments.rotation + delta + 360) % 360;
    onChange({ rotation: next });
  };

  return (
    <div className={`glass-panel rounded-2xl p-4 space-y-4 select-none ${className}`}>
      {/* Rotation Buttons */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-xs font-bold text-slate-300">Rotasi Foto</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleRotate(-90)}
            className="px-3 py-1.5 rounded-xl glass-panel text-xs font-bold text-slate-200 flex items-center gap-1.5 touch-manipulation active:scale-90"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>-90°</span>
          </button>
          <button
            type="button"
            onClick={() => handleRotate(90)}
            className="px-3 py-1.5 rounded-xl glass-panel text-xs font-bold text-slate-200 flex items-center gap-1.5 touch-manipulation active:scale-90"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>+90°</span>
          </button>
        </div>
      </div>

      {/* Brightness Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Kecerahan (Brightness)</span>
          </span>
          <span className="font-mono text-amber-400">
            {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}
          </span>
        </div>
        <input
          type="range"
          min={-50}
          max={50}
          value={adjustments.brightness}
          onChange={(e) => onChange({ brightness: parseInt(e.target.value, 10) })}
          className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* Contrast Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Contrast className="w-3.5 h-3.5 text-amber-400" />
            <span>Kontras (Contrast)</span>
          </span>
          <span className="font-mono text-amber-400">
            {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}
          </span>
        </div>
        <input
          type="range"
          min={-50}
          max={50}
          value={adjustments.contrast}
          onChange={(e) => onChange({ contrast: parseInt(e.target.value, 10) })}
          className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>
    </div>
  );
};
