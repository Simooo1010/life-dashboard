import React from 'react'
import { CircleCheck, CircleDashed, CircleX, ExternalLink } from 'lucide-react'
import type { LifeOsIssue, LifeOsSourceStatus } from '@/lib/life-os/types'

const STATE_LABELS = { available: 'Disponibile', empty: 'Vuota', partial: 'Parziale', unavailable: 'Non disponibile' }

export function SystemStatus({ sources, anomalies, pageUrl }: { sources: LifeOsSourceStatus[]; anomalies: LifeOsIssue[]; pageUrl: string }) {
  return (
    <details className="rounded-2xl border border-border bg-white dark:bg-surface p-5 text-sm">
      <summary className="cursor-pointer font-medium text-ink">Sistema e fonti</summary>
      <div className="mt-5 space-y-5 border-t border-border pt-5">
        <div className="space-y-3">
          {sources.map((source, index) => {
            const Icon = source.state === 'available' ? CircleCheck : source.state === 'unavailable' ? CircleX : CircleDashed
            return (
              <div key={`${source.source}:${source.sourceId ?? index}`} className="flex items-start gap-3">
                <Icon size={15} className={source.state === 'available' ? 'mt-0.5 text-green-600 dark:text-green-400' : source.state === 'unavailable' ? 'mt-0.5 text-red-500 dark:text-red-400' : 'mt-0.5 text-amber-600 dark:text-amber-400'} />
                <div>
                  <p className="text-xs font-medium text-ink">{source.label} · {STATE_LABELS[source.state]}</p>
                  {source.message && <p className="mt-0.5 text-xs text-ink-muted">{source.message}</p>}
                </div>
              </div>
            )
          })}
        </div>
        {anomalies.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-ink">Qualità dei dati</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">{anomalies.slice(0, 6).map(item => <li key={item.id}>{item.message}</li>)}</ul>
          </div>
        )}
        <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
          Apri Life OS in Notion <ExternalLink size={12} />
        </a>
      </div>
    </details>
  )
}
