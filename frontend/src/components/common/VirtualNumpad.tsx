import React from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

export interface VirtualNumpadProps {
  value: string;
  onChange: (newValue: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  submitLabel?: string;
  isSubmitDisabled?: boolean;
  className?: string;
}

export const VirtualNumpad: React.FC<VirtualNumpadProps> = ({
  value,
  onChange,
  onSubmit,
  maxLength = 16,
  submitLabel = 'OK',
  isSubmitDisabled = false,
  className = '',
}) => {
  const handleDigit = (digit: string) => {
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className={`grid grid-cols-3 gap-3 w-full max-w-sm select-none ${className}`}>
      {keys.map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => handleDigit(num)}
          className="h-16 rounded-2xl glass-panel text-2xl font-extrabold text-white flex items-center justify-center touch-manipulation active:scale-90 active:bg-amber-500/20 active:border-amber-500 transition-all cursor-pointer shadow-md"
        >
          {num}
        </button>
      ))}

      {/* Row 4: Clear / Backspace, 0, Submit */}
      <button
        type="button"
        onClick={value.length > 0 ? handleBackspace : handleClear}
        className="h-16 rounded-2xl glass-panel text-slate-300 flex items-center justify-center touch-manipulation active:scale-90 active:bg-red-500/20 active:border-red-500 transition-all cursor-pointer"
        aria-label="Hapus digit"
      >
        <Delete className="w-7 h-7" />
      </button>

      <button
        type="button"
        onClick={() => handleDigit('0')}
        className="h-16 rounded-2xl glass-panel text-2xl font-extrabold text-white flex items-center justify-center touch-manipulation active:scale-90 active:bg-amber-500/20 active:border-amber-500 transition-all cursor-pointer shadow-md"
      >
        0
      </button>

      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className="h-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center gap-1.5 touch-manipulation active:scale-90 transition-all shadow-glow-primary disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <span>{submitLabel}</span>
          <CornerDownLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClear}
          className="h-16 rounded-2xl glass-panel text-sm font-bold text-slate-400 flex items-center justify-center touch-manipulation active:scale-90 transition-all cursor-pointer"
        >
          C
        </button>
      )}
    </div>
  );
};
