import React from 'react'
import Link from 'next/link'
import { Brain } from 'lucide-react'
import type { RankedRecommendation } from '../../lib/second-brain/types'
import { RecommendationCard } from '../second-brain/RecommendationCard'

interface SecondBrainSectionProps {
  recommendations: RankedRecommendation[]
}

export function SecondBrainSection({ recommendations }: SecondBrainSectionProps) {
  const strongest = recommendations.slice(0, 2)
  if (strongest.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="section-label">Dal tuo Secondo Cervello</p>
          <Brain size={12} className="text-ink-faint" />
        </div>
        <Link href="/second-brain" prefetch={false} className="text-xs text-ink-muted hover:text-ink transition-colors">
          Vedi connessioni →
        </Link>
      </div>
      <div className="space-y-3">
        {strongest.map(recommendation => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
        ))}
      </div>
    </section>
  )
}
