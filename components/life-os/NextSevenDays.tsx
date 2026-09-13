import React from 'react'
import { formatDate } from '@/lib/utils'
import type { OperationalDay } from '@/lib/life-os/types'
import { LifeOsItemRow } from './LifeOsItemRow'

export function NextSevenDays({ days }: { days: OperationalDay[] }) {
  const visibleDays = days.filter(day => day.items.length > 0)
  return (
    <section aria-labelledby="next-seven-days" className="space-y-4">
      <div>
        <h2 id="next-seven-days" className="text-lg font-semibold tracking-tight text-ink">Prossimi 7 giorni</h2>
        <p className="mt-1 text-xs text-ink-muted">Lavoro e impegni ordinati per giorno.</p>
      </div>
      {visibleDays.length === 0 ? (
        <div className="border-y border-border py-6 text-sm text-ink-faint">Nessuna attività nei prossimi sette giorni.</div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {visibleDays.map(day => (
            <div key={day.date} className="grid gap-3 py-5 md:grid-cols-[9rem_1fr]">
              <div>
                <p className="text-sm font-semibold capitalize text-ink">{formatDate(day.date, { weekday: 'long' })}</p>
                <p className="text-xs text-ink-muted">{formatDate(day.date, { day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="divide-y divide-border/70">{day.items.map(item => <LifeOsItemRow key={item.id} item={item} />)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
