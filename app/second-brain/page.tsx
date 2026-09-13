import { AppShell } from '@/components/layout/AppShell'
import { fetchSecondBrainData, type SecondBrainData } from '@/lib/notion/second-brain'
import { formatDate } from '@/lib/utils'
import { Brain, Inbox, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SecondBrainPage() {
  let data: SecondBrainData | null = null
  try {
    data = await fetchSecondBrainData()
  } catch (e) {
    console.error('[SecondBrainPage]', e)
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">Secondo Cervello</h1>
          <Brain size={18} className="text-ink-muted" />
        </div>

        {!data ? (
          <div className="card text-center py-8">
            <p className="text-sm text-red-600">Dati non disponibili.</p>
          </div>
        ) : (
          <>
            {/* Recent concepts */}
            <section>
              <p className="section-label mb-3">Concetti recenti · {data.recentConcepts.length}</p>
              {data.recentConcepts.length === 0 ? (
                <div className="card text-center py-6">
                  <p className="text-sm text-ink-faint">Nessun concetto aggiornato di recente.</p>
                </div>
              ) : (
                <div className="card divide-y divide-border -my-px">
                  {data.recentConcepts.map(concept => (
                    <a key={concept.id} href={concept.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-surface/60 -mx-2 px-2 rounded-lg transition-colors group">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink group-hover:text-accent transition-colors">
                          {concept.concept}
                        </p>
                        {concept.category && (
                          <p className="text-xs text-ink-faint">{concept.category}</p>
                        )}
                      </div>
                      {concept.lastUpdated && (
                        <span className="text-xs text-ink-faint shrink-0">
                          {formatDate(concept.lastUpdated, { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <ExternalLink size={12} className="text-ink-faint shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Unprocessed sources */}
            {data.unprocessedSources.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Inbox size={14} className="text-amber-600" />
                  <p className="section-label">Da processare · {data.unprocessedSources.length}</p>
                </div>
                <div className="card divide-y divide-border -my-px">
                  {data.unprocessedSources.map(source => (
                    <div key={source.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink line-clamp-1">{source.name}</p>
                        {source.dateIngested && (
                          <p className="text-xs text-ink-faint">
                            Ingerito {formatDate(source.dateIngested, { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                      {source.sourceUrl && (
                        <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-accent hover:underline shrink-0">
                          Fonte
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
