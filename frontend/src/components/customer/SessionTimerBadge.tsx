import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export interface SessionTimerBadgeProps {
  secondsLeft: number;
  className?: string;
}

export const SessionTimerBadge: React.FC<SessionTimerBadgeProps> = ({
  secondsLeft,
  className = '',
}) => {
  const isUrgent = secondsLeft <= 30;
  const isWarning = secondsLeft <= 60 && !isUrgent;

  const formatTimer = (sec: number) => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`relative px-4 py-1.5 rounded-2xl flex items-center gap-3 transition-all duration-300 select-none shadow-xl border ${
        isUrgent
          ? 'bg-gradient-to-r from-rose-950/80 to-slate-950/90 border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_24px_rgba(244,63,94,0.4)] animate-pulse'
          : isWarning
          ? 'bg-gradient-to-r from-amber-950/70 to-slate-950/90 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_18px_rgba(245,158,11,0.25)]'
          : 'bg-slate-900/90 backdrop-blur-md border-amber-500/40 shadow-[0_0_14px_rgba(245,158,11,0.15)] ring-1 ring-white/10'
      } ${className}`}
      title="Sisa waktu sesi foto & edit frame"
    >
      {/* Icon Capsule with ambient background */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${
          isUrgent
            ? 'bg-rose-500/25 border-rose-500/50 text-rose-400 shadow-sm'
            : isWarning
            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-sm'
            : 'bg-amber-400/15 border-amber-400/30 text-amber-400 shadow-sm'
        }`}
      >
        {isUrgent ? (
          <AlertTriangle className="w-5 h-5 animate-bounce stroke-[2.5]" />
        ) : (
          <Clock className={`w-5 h-5 ${isWarning ? 'animate-pulse' : ''}`} />
        )}
      </div>

      {/* Label and Digital Display */}
      <div className="flex flex-col justify-center text-left min-w-[90px]">
        <div className="flex items-center gap-1.5 leading-none mb-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isUrgent
                ? 'bg-rose-400 animate-ping'
                : isWarning
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <span
            className={`text-[10px] font-black uppercase tracking-wider ${
              isUrgent
                ? 'text-rose-300 font-mono'
                : isWarning
                ? 'text-amber-300 font-mono'
                : 'text-slate-300'
            }`}
          >
            {isUrgent ? 'Segera Selesai!' : isWarning ? 'Waktu Menipis' : 'Sisa Waktu Sesi'}
          </span>
        </div>

        {/* Digital Time Digits */}
        <span
          className={`text-2xl font-black font-mono tracking-wider leading-none ${
            isUrgent
              ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]'
              : isWarning
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]'
          }`}
        >
          {formatTimer(secondsLeft)}
        </span>
      </div>
    </div>
  );
};
