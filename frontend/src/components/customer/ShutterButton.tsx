import React from 'react';
import { Camera, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ShutterButtonProps {
  onCapture: () => void;
  disabled?: boolean;
  isCountingDown?: boolean;
  className?: string;
  mode?: 'manual' | 'handsfree';
  isRunning?: boolean;
}

export const ShutterButton: React.FC<ShutterButtonProps> = ({
  onCapture,
  disabled = false,
  isCountingDown = false,
  className = '',
  mode = 'manual',
  isRunning = false,
}) => {
  const isHandsFree = mode === 'handsfree';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Dynamic Animated Ambient Glow Halo */}
      {!disabled && !isCountingDown && (
        <div
          className={`absolute -inset-2 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
            isRunning
              ? 'bg-rose-500/50 animate-ping'
              : isHandsFree
              ? 'bg-amber-400/35 animate-pulse'
              : 'bg-amber-500/30 animate-pulse'
          }`}
        />
      )}

      {/* Outer Studio Ring Border */}
      <div
        className={`p-1.5 rounded-full transition-all duration-300 ${
          isRunning
            ? 'border-2 border-rose-400/60 shadow-lg shadow-rose-500/40'
            : isHandsFree
            ? 'border-2 border-amber-400/60 shadow-lg shadow-amber-500/30'
            : 'border-2 border-amber-400/40'
        }`}
      >
        {/* Touch Button Shutter with tactile spring animation */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          disabled={disabled && !isRunning}
          onClick={onCapture}
          className={`relative w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center touch-manipulation cursor-pointer disabled:opacity-35 disabled:pointer-events-none disabled:shadow-none shadow-2xl ${
            isRunning
              ? 'border-rose-400 bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white'
              : isHandsFree
              ? 'border-amber-300 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-glow-primary'
              : 'border-amber-400 bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-glow-primary'
          }`}
          aria-label={
            isRunning
              ? 'Jeda Hands-Free'
              : isHandsFree
              ? 'Mulai Hands-Free'
              : 'Ambil Foto'
          }
        >
          {/* Inner Inset Bevel */}
          <div className="w-20 h-20 rounded-full border border-black/15 flex flex-col items-center justify-center bg-white/10 backdrop-blur-xs">
            {isRunning ? (
              <Pause className="w-9 h-9 stroke-[2.8] fill-current" />
            ) : isHandsFree ? (
              <Play className="w-9 h-9 ml-1 stroke-[2.8] fill-current" />
            ) : (
              <Camera className="w-10 h-10 stroke-[2.3]" />
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
};
