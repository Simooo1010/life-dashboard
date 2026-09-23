import React from 'react'
import { ExternalLink } from 'lucide-react'
import type { LifeOsOverview } from '@/lib/life-os/types'
import { NextSevenDays } from './NextSevenDays'
import { OtherLifeAreas } from './OtherLifeAreas'
import { SchoolOverview } from './SchoolOverview'
import { SystemStatus } from './SystemStatus'
import { TodayNow } from './TodayNow'

export function LifeOsDashboard({ overview }: { overview: LifeOsOverview }) {
  const updatedAt = new Date(overview.generatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  return (
    <div className="space-y-9">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Life OS</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">Quello che sta succedendo adesso, interpretato dalle tue fonti.</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span>Aggiornato alle {updatedAt}</span>
          <a href={overview.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">Apri Notion <ExternalLink size={12} /></a>
        </div>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.65fr)]">
        <TodayNow items={overview.today} />
        <SchoolOverview school={overview.school} />
      </div>
      <NextSevenDays days={overview.nextSevenDays} />
      <OtherLifeAreas areas={overview.otherAreas} />
      <SystemStatus sources={overview.sources} anomalies={overview.anomalies} pageUrl={overview.pageUrl} />
    </div>
  )
}
