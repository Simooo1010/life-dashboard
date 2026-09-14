import React from 'react'
import type { LifeAreaOverview } from '@/lib/life-os/types'
import { LifeOsItemRow } from './LifeOsItemRow'

export function OtherLifeAreas({ areas }: { areas: LifeAreaOverview[] }) {
  if (areas.length === 0) return null
  return (
    <section aria-labelledby="other-life-areas" className="space-y-4">
      <h2 id="other-life-areas" className="text-lg font-semibold tracking-tight text-ink">Altre aree</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {areas.map(area => (
          <div key={area.name} className="rounded-2xl border border-border bg-white dark:bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink">{area.name}</h3>
            <div className="mt-4 divide-y divide-border/70">{area.items.map(item => <LifeOsItemRow key={item.id} item={item} compact />)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
