import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = dateStr.includes('T')
    ? new Date(dateStr)
    : new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...opts,
  })
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Notte fonda'
  if (hour < 12) return 'Buongiorno'
  if (hour < 17) return 'Buon pomeriggio'
  if (hour < 21) return 'Buonasera'
  return 'Buonanotte'
}
