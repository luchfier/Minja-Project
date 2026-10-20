import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, Smile } from 'lucide-react';

export interface CountdownOverlayProps {
  count: number | null; // e.g. 3, 2, 1, or null
  isFlashActive?: boolean;
  modeBadge?: string | null;
  subMessage?: string | null;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  count,
  isFlashActive = false,
  modeBadge = null,
  subMessage = null,
}) => {
  const isSmilePhase = count === 1;

  return (
    <>
      {/* Studio Xenon Strobe Flash Simulation */}
      <AnimatePresence>
        {isFlashActive && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.1, 0.9, 0.2, 1] }}
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-white"
          >
            {/* Center Aperture Radial Flare Glow */}
            <div className="w-[80vw] h-[80vw] rounded-full bg-radial from-amber-100 via-white to-transparent blur-3xl opacity-80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Studio Countdown Screen Overlay */}
      <AnimatePresence mode="wait">
        {count !== null && count > 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md pointer-events-none select-none overflow-hidden">
            {/* Ambient Background Aura Pulses */}
            <motion.div
              key={`aura-${count}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.25, 1.1], opacity: isSmilePhase ? [0.4, 0.7, 0.5] : [0.25, 0.45, 0.35] }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={`absolute w-[450px] h-[450px] rounded-full blur-3xl ${
                isSmilePhase
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
                  : count === 2
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                  : 'bg-gradient-to-r from-amber-600 to-yellow-600'
              }`}
            />

            {/* Mode Capsule Header */}
            {modeBadge && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-5 py-2 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 font-black text-xs uppercase tracking-[0.25em] backdrop-blur-xl shadow-glow-primary flex items-center gap-2"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{modeBadge}</span>
              </motion.div>
            )}

            {/* Central Animated Countdown Ring & Counter Display */}
            <div className="relative flex items-center justify-center w-72 h-72">
              {/* Animated Circular SVG Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 200 200">
                {/* Background Track */}
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-white/10 fill-none"
                />
                {/* Active Dynamic Progress Arc */}
                <motion.circle
                  key={`arc-${count}`}
                  cx="100"
                  cy="100"
                  r="88"
                  stroke={isSmilePhase ? '#F59E0B' : '#FBBF24'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="553"
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: 553 }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className="fill-none drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                />
              </svg>

              {/* Center Glass Capsule with Counter Number */}
              <motion.div
                key={count}
                initial={{ scale: 0.35, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className={`w-52 h-52 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl backdrop-blur-2xl ${
                  isSmilePhase
                    ? 'border-amber-300/90 bg-black/60 shadow-[0_0_50px_rgba(245,158,11,0.45)]'
                    : 'border-amber-400/60 bg-black/50 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
                }`}
              >
                {isSmilePhase ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-500 font-mono tracking-tighter drop-shadow-lg leading-none">
                      {count}
                    </span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring' }}
                      className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-black tracking-widest uppercase"
                    >
                      <Smile className="w-3.5 h-3.5 text-amber-300" />
                      <span>SMILE!</span>
                    </motion.div>
                  </div>
                ) : (
                  <span className="text-8xl font-black text-amber-400 font-mono tracking-tighter drop-shadow-lg leading-none">
                    {count}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Subtitle / Direct Instruction Banner */}
            <motion.div
              key={`msg-${count}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 flex flex-col items-center gap-1.5"
            >
              {isSmilePhase ? (
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-500/40 to-amber-500/30 border border-amber-300/50 shadow-glow-primary">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                  <span className="text-white text-lg font-black tracking-wider uppercase drop-shadow-md">
                    TER SEN YUM! 📸
                  </span>
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                </div>
              ) : subMessage ? (
                <p className="text-white text-base font-bold tracking-wide drop-shadow-md text-center bg-black/70 px-6 py-2 rounded-full border border-white/15">
                  {subMessage}
                </p>
              ) : (
                <p className="text-slate-300 text-sm font-semibold tracking-wide drop-shadow-md text-center bg-black/60 px-5 py-1.5 rounded-full border border-white/10">
                  {count === 3 ? 'Bersiap di posisi...' : 'Tegakkan pandangan ke lensa kamera!'}
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
