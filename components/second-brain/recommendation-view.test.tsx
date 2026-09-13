import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SecondBrainSection } from '../home/SecondBrainSection'
import { RecommendationCard } from './RecommendationCard'
import type { RankedRecommendation } from '../../lib/second-brain/types'

function recommendation(id: string): RankedRecommendation {
  return {
    id, concept: `Concept ${id}`, category: 'Framework',
    whyToday: `Why ${id} is relevant to the real schedule today.`,
    keyIdea: `A stored key idea from page ${id}.`, url: `https://notion.so/${id}`,
    relatedConcept: 'Supporting concept', sourceMaterials: ['Research paper'], truthChecked: 'verified', score: 0.8,
    scoreBreakdown: { direct: 0.8, situational: 0.8, semantic: 0.8, graph: 0.05, quality: 0.06, recency: 0, repetitionPenalty: 0 },
    contextFactIds: ['calendar:today'], evidenceIds: [`${id}:e0`],
  }
}

describe('RecommendationCard', () => {
  it('renders grounded explanation fields and the original Notion link', () => {
    const html = renderToStaticMarkup(<RecommendationCard recommendation={recommendation('one')} />)
    expect(html).toContain('Perché oggi')
    expect(html).toContain('Idea chiave')
    expect(html).toContain('Why one is relevant')
    expect(html).toContain('A stored key idea')
    expect(html).toContain('href="https://notion.so/one"')
    expect(html).toContain('Verificato')
  })
})

describe('Home SecondBrainSection', () => {
  it('renders only the strongest two items from the shared ordered result', () => {
    const html = renderToStaticMarkup(
      <SecondBrainSection recommendations={[recommendation('one'), recommendation('two'), recommendation('three')]} />,
    )
    expect(html).toContain('Concept one')
    expect(html).toContain('Concept two')
    expect(html).not.toContain('Concept three')
    expect(html).not.toContain('Concetti recenti')
  })

  it('renders nothing when the shared result has no strong recommendation', () => {
    expect(renderToStaticMarkup(<SecondBrainSection recommendations={[]} />)).toBe('')
  })
})
