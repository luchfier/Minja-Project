import React, { useState } from 'react';
import { SmilePlus, Image as ImageIcon } from 'lucide-react';
import { StickerElement } from '../../types/editor';
import { StickerItem } from '../../types/assets';

export interface StickerPickerProps {
  onAddSticker: (sticker: Omit<StickerElement, 'id' | 'x' | 'y'>) => void;
  stickers?: StickerItem[];
  className?: string;
}

const DEFAULT_STICKERS: StickerItem[] = [
  { id: '1', name: 'Red Heart', category: 'Emoji', type: 'emoji', url: '❤️', isActive: true },
  { id: '2', name: 'Sparkles', category: 'Emoji', type: 'emoji', url: '✨', isActive: true },
  { id: '3', name: 'Cool Glasses', category: 'Emoji', type: 'emoji', url: '😎', isActive: true },
  { id: '4', name: 'Party Popper', category: 'Emoji', type: 'emoji', url: '🎉', isActive: true },
  { id: '5', name: 'Gold Crown', category: 'Emoji', type: 'emoji', url: '👑', isActive: true },
  { id: '6', name: 'Camera', category: 'Emoji', type: 'emoji', url: '📷', isActive: true },
  { id: '7', name: 'Butterfly', category: 'Emoji', type: 'emoji', url: '🦋', isActive: true },
  { id: '8', name: 'Pink Ribbon', category: 'Emoji', type: 'emoji', url: '🎀', isActive: true },
  { id: '9', name: 'Flame', category: 'Emoji', type: 'emoji', url: '🔥', isActive: true },
  { id: '10', name: 'Peace Sign', category: 'Emoji', type: 'emoji', url: '✌️', isActive: true },
  { id: '11', name: 'Cherry Blossom', category: 'Emoji', type: 'emoji', url: '🌸', isActive: true },
  { id: '12', name: 'Birthday Cake', category: 'Emoji', type: 'emoji', url: '🎂', isActive: true },
  { id: '13', name: 'Gold Star', category: 'Emoji', type: 'emoji', url: '⭐', isActive: true },
  { id: '14', name: 'Celebration', category: 'Emoji', type: 'emoji', url: '🥳', isActive: true },
];

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onAddSticker,
  stickers = DEFAULT_STICKERS,
  className = '',
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'emoji'>('all');

  const activeStickers = (stickers.length > 0 ? stickers : DEFAULT_STICKERS).filter((s) => s.isActive);
  
  const filtered = activeStickers.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.type === activeFilter;
  });

  const pngCount = activeStickers.filter((s) => s.type === 'image').length;
  const emojiCount = activeStickers.filter((s) => s.type === 'emoji').length;

  return (
    <div className={`glass-panel rounded-2xl p-4 select-none border border-white/10 space-y-3 ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <SmilePlus className="w-4 h-4 text-amber-400" />
          <span>Koleksi Stiker & Dekorasi</span>
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              activeFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({activeStickers.length})
          </button>
          {pngCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('image')}
              className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 ${
                activeFilter === 'image' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-2.5 h-2.5" />
              <span>PNG ({pngCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveFilter('emoji')}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              activeFilter === 'emoji' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Emoji ({emojiCount})
          </button>
        </div>
      </div>

      {/* Horizontal scrollable sticker strip with safe padding */}
      <div className="flex gap-2.5 overflow-x-auto p-2.5 rounded-xl bg-black/25 border border-white/5 custom-scrollbar">
        {filtered.map((s) => {
          const isImg = s.type === 'image';
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                onAddSticker({
                  name: s.name,
                  url: s.url,
                  scale: 1,
                  rotation: 0,
                })
              }
              className="flex-shrink-0 w-16 h-16 rounded-2xl glass-panel flex flex-col items-center justify-center gap-1 hover:border-amber-400/50 hover:bg-white/[0.08] touch-manipulation active:scale-90 transition-all cursor-pointer shadow-sm relative group p-1"
              title={`Sentuh untuk tempel stiker "${s.name}"`}
            >
              {isImg ? (
                <img
                  src={s.url}
                  alt={s.name}
                  className="w-9 h-9 object-contain pointer-events-none drop-shadow"
                />
              ) : (
                <span className="text-2xl pointer-events-none">{s.url}</span>
              )}
              <span className="text-[9px] text-slate-400 font-medium truncate max-w-[56px] leading-tight block text-center">
                {s.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
