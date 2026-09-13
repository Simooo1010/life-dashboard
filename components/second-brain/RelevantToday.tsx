import React from 'react'
import type { RankedRecommendation } from '../../lib/second-brain/types'
import { RecommendationCard } from './RecommendationCard'

export function RelevantToday({ recommendations }: { recommendations: RankedRecommendation[] }) {
  return (
    <section aria-labelledby="relevant-today-heading" className="space-y-3">
      <div>
        <p className="section-label mb-1">Contesto attuale</p>
        <h2 id="relevant-today-heading" className="text-lg font-semibold text-ink">Rilevante oggi</h2>
      </div>
      {recommendations.length > 0 ? (
        <div className="space-y-3">{recommendations.map(item => <RecommendationCard key={item.id} recommendation={item} />)}</div>
      ) : (
        <div className="card py-6">
          <p className="text-sm text-ink-muted">Nessun contenuto del Knowledge Graph è abbastanza rilevante per il contesto di oggi.</p>
        </div>
      )}
    </section>
  )
}
