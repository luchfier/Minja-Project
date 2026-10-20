import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'active' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  isSelected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  isSelected = false,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }[padding];

  let variantClass = 'glass-panel';
  if (variant === 'elevated') {
    variantClass = 'glass-panel-elevated';
  } else if (variant === 'active' || isSelected) {
    variantClass = 'glass-panel-active';
  } else if (variant === 'interactive') {
    variantClass =
      'glass-panel cursor-pointer touch-manipulation transition-all duration-200 active:scale-[0.98] hover:border-amber-500/40';
  }

  return (
    <div
      className={`rounded-3xl relative overflow-hidden ${variantClass} ${paddingStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
