import React from 'react'
import { BookOpenCheck, CalendarDays, ClipboardCheck, ExternalLink, GraduationCap, ListTodo, Mic2 } from 'lucide-react'
import type { OperationalItem } from '@/lib/life-os/types'
import { formatTime } from '@/lib/utils'

const TYPE_LABELS: Record<OperationalItem['type'], string> = {
  homework: 'Compiti',
  'written-assessment': 'Verifica scritta',
  'oral-assessment': 'Interrogazione',
  'school-event': 'Evento scolastico',
  obligation: 'Impegno',
  other: 'Altro',
  'calendar-event': 'Calendario',
  schedule: 'Lezione',
}

const TYPE_ICONS = {
  homework: ListTodo,
  'written-assessment': ClipboardCheck,
  'oral-assessment': Mic2,
  'school-event': GraduationCap,
  obligation: BookOpenCheck,
  other: CalendarDays,
  'calendar-event': CalendarDays,
  schedule: BookOpenCheck,
} satisfies Record<OperationalItem['type'], typeof CalendarDays>

export function LifeOsItemRow({ item, compact = false }: { item: OperationalItem; compact?: boolean }) {
  const Icon = TYPE_ICONS[item.type]
  const time = item.start?.includes('T') ? formatTime(item.start) : null

  return (
    <div className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-semantic-school">
        <Icon size={14} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-ink">{item.title}</p>
          <span className="text-2xs font-medium text-ink-muted">{TYPE_LABELS[item.type]}</span>
        </div>
        {!compact && (item.subject || time) && (
          <p className="mt-0.5 text-xs text-ink-muted">
            {[time, item.subject].filter(Boolean).join(' · ')}
          </p>
        )}
        {item.issues.length > 0 && (
          <p className="mt-1 text-xs text-amber-700">{item.issues[0].message}</p>
        )}
      </div>
      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apri ${item.title} in Notion`}
          className="mt-1 shrink-0 text-ink-faint transition-colors hover:text-accent"
        >
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
