'use client'

import { cn } from '@/lib/utils'

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  loading?: boolean
}

export function PrimaryButton({ children, loading, className, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        'px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl',
        'hover:bg-accent/90 active:scale-[0.98] transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}
