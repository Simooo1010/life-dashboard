import React from 'react'
import { formatDate } from '@/lib/utils'
import type { SchoolOverview as SchoolOverviewData } from '@/lib/life-os/types'

export function SchoolOverview({ school }: { school: SchoolOverviewData }) {
  const hasData = school.openHomeworkCount > 0 || school.upcomingAssessmentCount > 0 || school.subjectsInvolved.length > 0
  const maxScore = Math.max(1, ...school.workload.map(day => day.score))

  return (
    <section aria-labelledby="school-overview" className="rounded-3xl border border-border bg-surface/55 p-5 md:p-6">
      <h2 id="school-overview" className="text-lg font-semibold tracking-tight text-ink">Quadro scuola</h2>
      {!hasData ? (
        <div className="py-8">
          <p className="text-sm font-medium text-ink">Nessun lavoro scolastico aperto</p>
          <p className="mt-1 text-xs text-ink-muted">Valutazioni e attività compariranno quando saranno presenti nelle fonti.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-5 border-b border-border pb-5">
            <div>
              <p className="text-3xl font-semibold tabular-nums text-ink">{school.openHomeworkCount}</p>
              <p className="mt-1 text-xs text-ink-muted">compiti aperti</p>
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums text-ink">{school.upcomingAssessmentCount}</p>
              <p className="mt-1 text-xs text-ink-muted">valutazioni vicine</p>
            </div>
          </div>
          {school.nearestAssessments.length > 0 && (
            <div className="border-b border-border py-4">
              <p className="text-xs text-ink-muted">Più vicina · {formatDate(school.nearestAssessments[0].date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{school.nearestAssessments.map(item => item.subject ?? item.title).join(', ')}</p>
            </div>
          )}
          {school.workload.length > 0 && (
            <div className="pt-4">
              <p className="text-xs font-medium text-ink-muted">Carico scolastico</p>
              <div className="mt-3 flex h-20 items-end gap-2" aria-label="Carico scolastico nei prossimi sette giorni">
                {school.workload.map(day => (
                  <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-2xs tabular-nums text-ink-faint">{day.count || '–'}</span>
                    <div className="flex h-10 w-full items-end overflow-hidden rounded-md bg-white dark:bg-white/10">
                      <div className="w-full rounded-md bg-semantic-school/75" style={{ height: `${Math.max(day.score > 0 ? 18 : 0, (day.score / maxScore) * 100)}%` }} />
                    </div>
                    <span className="text-2xs capitalize text-ink-muted">{formatDate(day.date, { weekday: 'short' }).replace('.', '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
