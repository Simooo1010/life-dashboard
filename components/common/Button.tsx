'use client'

import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RefreshButtonProps {
  onClick: () => void
  loading?: boolean
  className?: string
  label?: string
}

export function RefreshButton({ onClick, loading, className, label = 'Aggiorna' }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors disabled:opacity-50',
        className,
      )}
    >
      <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
      {label}
    </button>
  )
}

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
