'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  BookOpen,
  Brain,
  CloudSun,
  Newspaper,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',               icon: Home,       label: 'Oggi' },
  { href: '/calendar',       icon: Calendar,   label: 'Calendario' },
  { href: '/finance',        icon: Wallet,     label: 'Finanze' },
  { href: '/weather',        icon: CloudSun,   label: 'Meteo' },
  { href: '/life-os',        icon: BookOpen,   label: 'Life OS' },
  { href: '/second-brain',   icon: Brain,      label: 'Secondo Cervello' },
  { href: '/newsletter',     icon: Newspaper,  label: 'Newsletter' },
]

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh">
      {/* ─── Desktop sidebar ───────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-border bg-surface sticky top-0 h-dvh">
        {/* Logo / title */}
        <div className="px-5 py-6 border-b border-border">
          <span className="text-sm font-semibold text-ink tracking-tight">Life OS</span>
          <p className="text-2xs text-ink-muted mt-0.5">Dashboard personale</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                  active
                    ? 'bg-accent text-white font-medium'
                    : 'text-ink-muted hover:bg-border hover:text-ink',
                )}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <Link
            href="/settings"
            prefetch={false}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-muted hover:bg-border hover:text-ink transition-colors"
          >
            <Settings size={16} strokeWidth={2} />
            Impostazioni
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-muted hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={16} strokeWidth={2} />
            Esci
          </button>
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 pb-20 md:pb-8">
        {children}
      </main>

      {/* ─── Mobile bottom bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-surface border-t border-border flex items-center justify-around px-2 py-2 safe-area-bottom">
        {NAV_ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0',
                active ? 'text-accent' : 'text-ink-muted',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-2xs font-medium truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
