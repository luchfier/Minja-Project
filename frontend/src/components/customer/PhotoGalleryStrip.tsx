import React, { useState } from 'react';
import { Trash2, Sparkles, ZoomIn, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PhotoGalleryStripProps {
  photos: string[];
  maxPhotos?: number;
  onDelete: (index: number) => void;
  className?: string;
}

export const PhotoGalleryStrip: React.FC<PhotoGalleryStripProps> = ({
  photos,
  maxPhotos = 10,
  onDelete,
  className = '',
}) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  return (
    <>
      <div className={`glass-panel rounded-3xl px-5 py-3.5 select-none ${className}`}>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <span>🎞️</span>
              <span>Galeri Jepretan ({photos.length} Foto)</span>
            </span>
            <span className="hidden md:inline-block text-[11px] text-slate-400">
              • Ketuk foto untuk perbesar atau hapus jika ingin foto ulang
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full border transition-all ${
                photos.length >= maxPhotos
                  ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40'
                  : 'text-amber-400 bg-amber-500/15 border-amber-500/30'
              }`}
            >
              {photos.length} / {maxPhotos} Foto
            </span>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="py-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400 mr-2 animate-spin" />
            <span>Belum ada foto yang diambil. Tekan tombol shutter untuk mulai (Maksimal {maxPhotos} foto).</span>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            <AnimatePresence>
              {photos.map((url, idx) => {
                const isLatest = idx === photos.length - 1;
                return (
                  <motion.div
                    key={`${url.slice(0, 30)}-${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setPreviewIndex(idx)}
                    className={`relative flex-shrink-0 w-32 h-22 rounded-2xl overflow-hidden border-2 cursor-pointer group shadow-lg transition-transform hover:scale-105 ${
                      isLatest
                        ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
                        : 'border-white/15 bg-slate-900'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Jepretan ke-${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Number Badge */}
                    <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-xs text-[10px] font-black px-2 py-0.5 rounded-full text-white border border-white/20">
                      #{idx + 1}
                    </div>

                    {/* Hover Zoom Hint */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                    </div>

                    {/* Quick Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(idx);
                      }}
                      className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-xl bg-rose-600/90 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer z-10"
                      title={`Hapus foto #${idx + 1} untuk ambil ulang`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty Slot Placeholder Indicator */}
            {photos.length < maxPhotos && (
              <div className="flex-shrink-0 w-32 h-22 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center text-center p-2 text-slate-400">
                <span className="text-[11px] font-bold text-slate-300">Slot #{photos.length + 1}</span>
                <span className="text-[9px] text-amber-400/80 font-medium">Siap Difoto</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Large Preview Modal on Tap */}
      <AnimatePresence>
        {previewIndex !== null && photos[previewIndex] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setPreviewIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated p-6 rounded-3xl max-w-xl w-full border border-white/20 shadow-2xl flex flex-col items-center gap-4"
            >
              <div className="w-full flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-sm font-black text-amber-400 uppercase tracking-wider">
                  Foto #{previewIndex + 1} dari {photos.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Display */}
              <div className="relative w-full max-h-[60vh] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-inner flex items-center justify-center">
                <img
                  src={photos[previewIndex]}
                  alt={`Preview Foto #${previewIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Actions */}
              <div className="w-full flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = previewIndex;
                    setPreviewIndex(null);
                    onDelete(idx);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Hapus & Foto Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer hover:bg-amber-300 active:scale-95 shadow-md"
                >
                  Simpan & Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
