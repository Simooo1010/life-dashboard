import { cn } from '@/lib/utils'
import type { EventCategory } from '@/lib/calendar/google'

const CATEGORY_CONFIG: Record<EventCategory | 'school' | 'inbox', {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  school:     { label: 'Scuola',     bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  sport:      { label: 'Sport',      bg: 'bg-green-50 dark:bg-green-950/40',  text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  health:     { label: 'Salute',     bg: 'bg-rose-50 dark:bg-rose-950/40',   text: 'text-rose-700 dark:text-rose-300',   dot: 'bg-rose-500' },
  newsletter: { label: 'Newsletter', bg: 'bg-amber-50 dark:bg-amber-950/40',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
  personal:   { label: 'Personale',  bg: 'bg-gray-100 dark:bg-gray-800/40',  text: 'text-gray-700 dark:text-gray-300',   dot: 'bg-gray-400' },
  other:      { label: 'Altro',      bg: 'bg-gray-100 dark:bg-gray-800/40',  text: 'text-gray-600 dark:text-gray-300',   dot: 'bg-gray-400' },
  inbox:      { label: 'Inbox',      bg: 'bg-gray-100 dark:bg-gray-800/40',  text: 'text-gray-600 dark:text-gray-300',   dot: 'bg-gray-400' },
}

interface BadgeProps {
  category: keyof typeof CATEGORY_CONFIG
  size?: 'xs' | 'sm'
  showDot?: boolean
  label?: string
  className?: string
}

export function CategoryBadge({ category, size = 'sm', showDot = false, label, className }: BadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other
  const text = label ?? config.label
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        config.bg,
        config.text,
        size === 'xs' ? 'text-2xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className,
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />}
      {text}
    </span>
  )
}

// ─── Urgency badge ────────────────────────────────────────────────────────────
const URGENCY_CONFIG = {
  high:   { label: 'Urgente',  bg: 'bg-red-50 dark:bg-red-950/40',    text: 'text-red-700 dark:text-red-300' },
  medium: { label: 'Media',    bg: 'bg-amber-50 dark:bg-amber-950/40',  text: 'text-amber-700 dark:text-amber-300' },
  low:    { label: 'Bassa',    bg: 'bg-gray-100 dark:bg-gray-800/40',  text: 'text-gray-600 dark:text-gray-300' },
}

export function UrgencyBadge({ urgency, className }: { urgency: 'high' | 'medium' | 'low'; className?: string }) {
  const config = URGENCY_CONFIG[urgency]
  return (
    <span className={cn('text-2xs font-semibold px-1.5 py-0.5 rounded-full', config.bg, config.text, className)}>
      {config.label}
    </span>
  )
}
