import React from 'react';
import { DeviceConnectionStatus } from '../../types/hardware';

export interface DeviceStatusBadgeProps {
  status: DeviceConnectionStatus;
  label?: string;
  showDot?: boolean;
  className?: string;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  status,
  label,
  showDot = true,
  className = '',
}) => {
  const statusConfig = {
    connected: {
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400 animate-pulse',
      defaultLabel: 'Terhubung',
    },
    demo: {
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
      defaultLabel: 'Siap / Standby',
    },
    disconnected: {
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      defaultLabel: 'Terputus',
    },
    busy: {
      color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      dot: 'bg-sky-400 animate-ping',
      defaultLabel: 'Sibuk',
    },
    error: {
      color: 'bg-red-500/20 text-red-300 border-red-500/40',
      dot: 'bg-red-500',
      defaultLabel: 'Gangguan Perangkat',
    },
  }[status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md select-none ${statusConfig.color} ${className}`}
    >
      {showDot && (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot}`} />
      )}
      <span>{label || statusConfig.defaultLabel}</span>
    </div>
  );
};
