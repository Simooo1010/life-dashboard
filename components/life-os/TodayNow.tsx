import React from 'react'
import { CircleAlert } from 'lucide-react'
import type { OperationalItem } from '@/lib/life-os/types'
import { LifeOsItemRow } from './LifeOsItemRow'

export function TodayNow({ items }: { items: OperationalItem[] }) {
  return (
    <section aria-labelledby="life-os-today" className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-semantic-school" aria-hidden="true" />
      <div className="mb-5 flex items-start justify-between gap-4 pl-1">
        <div>
          <h2 id="life-os-today" className="text-lg font-semibold tracking-tight text-ink">Oggi e adesso</h2>
          <p className="mt-1 text-xs text-ink-muted">Scuola, scadenze e impegni che incidono sulla giornata.</p>
        </div>
        {items.some(item => item.issues.length > 0) && <CircleAlert size={17} className="mt-1 shrink-0 text-amber-600" aria-label="Ci sono elementi da controllare" />}
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-border/80 pl-1">
          {items.map(item => <LifeOsItemRow key={item.id} item={item} />)}
        </div>
      ) : (
        <p className="py-5 pl-1 text-sm text-ink-faint">Nessuna attività rilevante per oggi.</p>
      )}
    </section>
  )
}
