import React from 'react'
import type { RankedRecommendation } from '../../lib/second-brain/types'
import { RecommendationCard } from './RecommendationCard'

export function Rediscover({ recommendations }: { recommendations: RankedRecommendation[] }) {
  if (recommendations.length === 0) return null
  return (
    <section aria-labelledby="rediscover-heading" className="space-y-3">
      <div>
        <p className="section-label mb-1">Connessioni curate</p>
        <h2 id="rediscover-heading" className="text-lg font-semibold text-ink">Da riscoprire</h2>
        <p className="mt-1 text-sm text-ink-muted">Concetti non recenti che formano un collegamento utile con i temi emersi oggi.</p>
      </div>
      <div className="space-y-3">{recommendations.map(item => <RecommendationCard key={item.id} recommendation={item} />)}</div>
    </section>
  )
}
