import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]'

    const variants = {
      default: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm hover:shadow',
      dark: 'bg-neutral-950 text-neutral-50 hover:bg-neutral-900 shadow-sm',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
      outline: 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400',
      ghost: 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5 font-semibold',
      icon: 'h-10 w-10 p-0',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
