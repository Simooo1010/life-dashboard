import { describe, expect, it } from 'vitest'
import type {
  GroundedAssessment,
  KnowledgeDocument,
  KnowledgeNode,
  RecommendationHistoryEntry,
} from './types'
import { expandGraphCandidates, rankRecommendations } from './rank'

function node(id: string, overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id,
    concept: id,
    category: 'Framework',
    lastUpdated: '2026-01-01',
    lastEditedAt: '2026-01-01T10:00:00.000Z',
    relatedIds: [],
    sourceMaterials: [],
    truthChecked: 'unknown',
    url: `https://notion.so/${id}`,
    ...overrides,
  }
}

function document(nodeId: string, content = 'A substantive stored idea with enough detail to support a grounded recommendation.'): KnowledgeDocument {
  return {
    nodeId,
    revision: 'rev',
    content,
    excerpt: content,
    evidence: [{ id: `${nodeId}:e0`, text: content }],
  }
}

function assessment(candidateId: string, score: number): GroundedAssessment {
  return {
    candidateId,
    directRelevance: score,
    situationalUsefulness: score,
    semanticRelevance: score,
    contextFactIds: ['calendar:today'],
    evidenceIds: [`${candidateId}:e0`],
    whyToday: `Real context supports ${candidateId}.`,
    keyIdea: `Stored content supports ${candidateId}.`,
  }
}

describe('expandGraphCandidates', () => {
  it('adds one-hop related concepts without recursively walking the whole graph', () => {
    const graph = [
      node('seed', { relatedIds: ['neighbor'] }),
      node('neighbor', { relatedIds: ['second-hop'] }),
      node('second-hop'),
    ]

    expect(expandGraphCandidates(['seed'], graph)).toEqual(['seed', 'neighbor'])
  })
})

describe('rankRecommendations', () => {
  it('lets an older strongly relevant page beat a newly edited irrelevant page', () => {
    const nodes = [
      node('older-relevant'),
      node('recent-irrelevant', { lastEditedAt: '2026-09-13T09:00:00.000Z', lastUpdated: '2026-09-13' }),
    ]
    const ranked = rankRecommendations({
      nodes,
      documents: nodes.map(item => document(item.id)),
      assessments: [assessment('older-relevant', 0.9), assessment('recent-irrelevant', 0.2)],
      history: [],
      localDate: '2026-09-13',
    })

    expect(ranked.map(item => item.id)).toEqual(['older-relevant'])
  })

  it('omits weak results rather than filling the requested maximum', () => {
    const candidate = node('weak')
    expect(rankRecommendations({
      nodes: [candidate],
      documents: [document(candidate.id)],
      assessments: [assessment(candidate.id, 0.45)],
      history: [],
      localDate: '2026-09-13',
    })).toEqual([])
  })

  it('penalizes recently surfaced concepts without permanently banning a strong match', () => {
    const nodes = [node('repeated'), node('fresh')]
    const history: RecommendationHistoryEntry[] = [
      { pageId: 'repeated', date: '2026-09-12' },
      { pageId: 'repeated', date: '2026-09-11' },
    ]
    const ranked = rankRecommendations({
      nodes,
      documents: nodes.map(item => document(item.id)),
      assessments: [assessment('repeated', 0.9), assessment('fresh', 0.88)],
      history,
      localDate: '2026-09-13',
    })

    expect(ranked[0].id).toBe('fresh')
    expect(ranked.some(item => item.id === 'repeated')).toBe(true)
    expect(ranked.find(item => item.id === 'repeated')?.scoreBreakdown.repetitionPenalty).toBeGreaterThan(0)
  })

  it('uses a relevant related concept as a graph boost', () => {
    const nodes = [
      node('focus', { relatedIds: ['cognitive-load'] }),
      node('cognitive-load', { category: 'Concept' }),
      node('unconnected', { category: 'Concept' }),
    ]
    const ranked = rankRecommendations({
      nodes,
      documents: nodes.map(item => document(item.id)),
      assessments: [assessment('focus', 0.9), assessment('cognitive-load', 0.68), assessment('unconnected', 0.68)],
      history: [],
      localDate: '2026-09-13',
    })

    expect(ranked.find(item => item.id === 'cognitive-load')!.score)
      .toBeGreaterThan(ranked.find(item => item.id === 'unconnected')!.score)
  })
})
