import React from 'react';
import { ButtonSoundCategory } from '../../types/audio';
import { playButtonSound } from '../../services/soundEffects';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'glass' | 'warning';
  size?: 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  soundCategory?: ButtonSoundCategory | 'none';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'lg',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  soundCategory,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-bold tracking-wide rounded-2xl select-none transition-all duration-150 touch-manipulation active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

  const sizeStyles = {
    md: 'min-h-[48px] px-5 py-3 text-base gap-2',
    lg: 'min-h-[56px] px-8 py-4 text-lg gap-3',
    xl: 'min-h-[68px] px-10 py-5 text-xl gap-4 shadow-lg',
  }[size];

  const variantStyles = {
    primary:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 shadow-glow-primary font-extrabold',
    secondary:
      'bg-slate-800/80 hover:bg-slate-700 text-white border border-white/10 active:bg-slate-900',
    ghost:
      'bg-transparent hover:bg-white/5 text-slate-200 active:bg-white/10',
    danger:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg shadow-red-950/40',
    warning:
      'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-lg shadow-amber-950/40',
    gold:
      'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-glow-primary font-black',
    glass:
      'glass-panel text-white hover:border-amber-500/50 active:bg-white/10 border-white/15',
  }[variant];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    if (soundCategory !== 'none') {
      const category: ButtonSoundCategory =
        soundCategory ||
        (variant === 'danger'
          ? 'delete'
          : variant === 'ghost'
          ? 'navigation'
          : variant === 'secondary' || variant === 'glass'
          ? 'secondary'
          : 'primary');

      playButtonSound(category);
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-3">
          <svg
            className="animate-spin h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Memproses...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
