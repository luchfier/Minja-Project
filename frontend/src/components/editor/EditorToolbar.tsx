import React from 'react';
import { Undo2, Redo2, Type, RotateCcw, Eye } from 'lucide-react';

export interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddText: () => void;
  onReset: () => void;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddText,
  onReset,
  onTogglePreview,
  isPreviewOpen,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-1.5 select-none px-1 py-0.5 ${className}`}>
      {/* Left Action Buttons: Undo, Redo, Add Text, Reset */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo Button */}
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="h-10 px-3 rounded-xl glass-panel text-white flex items-center gap-1.5 text-xs font-bold touch-manipulation active:scale-95 disabled:opacity-30 disabled:pointer-events-none hover:border-amber-400/40 transition-all cursor-pointer shadow-sm"
          aria-label="Batalkan aksi (Undo)"
        >
          <Undo2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Undo</span>
        </button>

        {/* Redo Button */}
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          className="h-10 px-3 rounded-xl glass-panel text-white flex items-center gap-1.5 text-xs font-bold touch-manipulation active:scale-95 disabled:opacity-30 disabled:pointer-events-none hover:border-amber-400/40 transition-all cursor-pointer shadow-sm"
          aria-label="Ulangi aksi (Redo)"
        >
          <Redo2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Redo</span>
        </button>

        {/* Add Custom Text Button */}
        <button
          type="button"
          onClick={onAddText}
          className="h-10 px-3 rounded-xl glass-panel text-white flex items-center gap-1.5 text-xs font-bold touch-manipulation active:scale-95 hover:border-amber-400/40 transition-all cursor-pointer shadow-sm"
        >
          <Type className="w-3.5 h-3.5 text-amber-400" />
          <span>Tambah Teks</span>
        </button>

        {/* Reset Adjustments Button */}
        <button
          type="button"
          onClick={onReset}
          className="h-10 px-2.5 rounded-xl glass-panel text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold touch-manipulation active:scale-95 hover:border-rose-400/40 transition-all cursor-pointer shadow-sm"
          title="Reset semua editan"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right Preview Toggle Button (Clean "Pratinjau Cetak" without tacky 4R) */}
      <button
        type="button"
        onClick={onTogglePreview}
        className={`h-10 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-bold touch-manipulation active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap ml-1 ${
          isPreviewOpen
            ? 'bg-amber-500 text-slate-950 font-black shadow-glow-primary'
            : 'glass-panel text-amber-400 border-amber-500/30 hover:border-amber-400/60'
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Pratinjau Cetak</span>
      </button>
    </div>
  );
};
