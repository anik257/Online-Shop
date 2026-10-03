import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'accent' | 'warning'
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-neutral-900 text-white',
    secondary: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
    outline: 'border border-neutral-300 text-neutral-700 bg-white',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    accent: 'bg-amber-50 text-amber-800 border border-amber-200',
    warning: 'bg-orange-50 text-orange-700 border border-orange-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
