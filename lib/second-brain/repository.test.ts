import { describe, expect, it } from 'vitest'
import { buildRunCacheKey, uniqueHistoryEntries } from './repository'
import type { RankedRecommendation } from './types'

function recommendation(id: string): RankedRecommendation {
  return {
    id,
    concept: id,
    category: null,
    whyToday: 'Grounded in context.',
    keyIdea: 'Grounded in content.',
    url: `https://notion.so/${id}`,
    sourceMaterials: [],
    truthChecked: 'unknown',
    score: 0.7,
    scoreBreakdown: { direct: 0.7, situational: 0.7, semantic: 0.7, graph: 0, quality: 0, recency: 0, repetitionPenalty: 0 },
    contextFactIds: ['calendar:1'],
    evidenceIds: [`${id}:e0`],
  }
}

describe('second brain repository helpers', () => {
  it('builds a stable cache key that changes with context, graph, or ranking version', () => {
    const base = buildRunCacheKey('2026-09-13', 'context-a', 'graph-a', 'v1')
    expect(base).toBe(buildRunCacheKey('2026-09-13', 'context-a', 'graph-a', 'v1'))
    expect(base).not.toBe(buildRunCacheKey('2026-09-13', 'context-b', 'graph-a', 'v1'))
    expect(base).not.toBe(buildRunCacheKey('2026-09-13', 'context-a', 'graph-b', 'v1'))
    expect(base).not.toBe(buildRunCacheKey('2026-09-13', 'context-a', 'graph-a', 'v2'))
  })

  it('records each surfaced page at most once per local day across both sections', () => {
    expect(uniqueHistoryEntries(
      '2026-09-13',
      [recommendation('a'), recommendation('b')],
      [recommendation('a')],
    )).toEqual([
      { date: '2026-09-13', pageId: 'a', score: 0.7 },
      { date: '2026-09-13', pageId: 'b', score: 0.7 },
    ])
  })
})
