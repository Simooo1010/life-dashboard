import React from 'react'
import Link from 'next/link'
import type { LifeOsOverview } from '@/lib/life-os/types'

export function LifeOsPulse({ overview }: { overview?: LifeOsOverview }) {
  if (!overview) return null
  const todayCount = overview.today.length
  const tomorrowCount = overview.tomorrow.length
  const schoolCount = overview.school.openHomeworkCount + overview.school.upcomingAssessmentCount
  return (
    <section aria-labelledby="life-os-pulse" className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label">Life OS</p>
          <h2 id="life-os-pulse" className="text-lg font-semibold tracking-tight text-ink">Il polso della settimana</h2>
        </div>
        <Link href="/life-os" className="text-xs font-medium text-accent hover:underline">Apri dashboard →</Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3"><p className="text-2xl font-semibold text-ink">{todayCount}</p><p className="text-2xs text-ink-muted">oggi</p></div>
        <div className="rounded-2xl border border-border bg-white p-3"><p className="text-2xl font-semibold text-ink">{tomorrowCount}</p><p className="text-2xs text-ink-muted">domani</p></div>
        <div className="rounded-2xl border border-border bg-white p-3"><p className="text-2xl font-semibold text-ink">{schoolCount}</p><p className="text-2xs text-ink-muted">scuola aperta</p></div>
      </div>
      {overview.anomalies.length > 0 && <p className="text-xs text-amber-700">{overview.anomalies[0].message}</p>}
    </section>
  )
}
