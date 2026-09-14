import React from 'react'
import { ArrowUpRight, CheckCircle2, Link2 } from 'lucide-react'
import type { RankedRecommendation } from '../../lib/second-brain/types'

interface RecommendationCardProps {
  recommendation: RankedRecommendation
  compact?: boolean
}

export function RecommendationCard({ recommendation, compact = false }: RecommendationCardProps) {
  return (
    <article className={compact ? 'rounded-2xl border border-border/80 bg-white/60 dark:bg-surface/60 p-4' : 'card space-y-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {recommendation.category && (
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-accent mb-1.5">
              {recommendation.category}
            </p>
          )}
          <h3 className="text-base font-semibold leading-snug text-ink">{recommendation.concept}</h3>
        </div>
        <a
          href={recommendation.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apri ${recommendation.concept} in Notion`}
          className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-accent"
        >
          <ArrowUpRight size={15} />
        </a>
      </div>

      <div className={compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint mb-1">Perché oggi</p>
          <p className="text-sm leading-relaxed text-ink">{recommendation.whyToday}</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint mb-1">Idea chiave</p>
          <p className="text-sm leading-relaxed text-ink-muted">{recommendation.keyIdea}</p>
        </div>
      </div>

      {(recommendation.relatedConcept || recommendation.sourceMaterials.length > 0 || recommendation.truthChecked === 'verified') && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-ink-faint">
          {recommendation.relatedConcept && (
            <span className="inline-flex items-center gap-1.5"><Link2 size={12} />{recommendation.relatedConcept}</span>
          )}
          {recommendation.sourceMaterials[0] && <span>Fonte: {recommendation.sourceMaterials[0]}</span>}
          {recommendation.truthChecked === 'verified' && (
            <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400"><CheckCircle2 size={12} />Verificato</span>
          )}
        </div>
      )}
    </article>
  )
}
