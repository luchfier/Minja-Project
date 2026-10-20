import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Terjadi Kendala',
  message,
  onRetry,
  retryText = 'Coba Lagi',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center rounded-3xl glass-panel border-red-500/20 bg-red-950/10 ${className}`}
    >
      <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 mb-6 border border-red-500/30">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-300 max-w-md text-base leading-relaxed mb-6">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RotateCcw className="w-5 h-5" />}
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};
