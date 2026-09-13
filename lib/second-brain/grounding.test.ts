import { describe, expect, it } from 'vitest'
import type { DailyContext } from '@/lib/daily-context/types'
import type { KnowledgeDocument, SemanticAssessment } from './types'
import { validateSemanticAssessments } from './grounding'

const context: DailyContext = {
  localDate: '2026-09-13',
  timeZone: 'Europe/Rome',
  facts: [{
    id: 'calendar:exam',
    source: 'calendar',
    kind: 'assessment',
    title: 'Physics test',
    detail: 'Tomorrow',
    occursAt: '2026-09-14',
    urgency: 'soon',
    sourceUrl: null,
    tokens: ['physics', 'test'],
  }],
  workload: { todayCount: 1, nextThreeDaysCount: 2, assessmentCount: 1, concentration: 'medium' },
  sourceStatuses: [],
  contextHash: 'context-hash',
}

const documents: KnowledgeDocument[] = [{
  nodeId: 'node-1',
  revision: 'rev-1',
  content: 'Interleaving alternates related problem types to improve discrimination and durable recall.',
  excerpt: 'Interleaving alternates related problem types.',
  evidence: [{ id: 'node-1:e0', text: 'Interleaving alternates related problem types.' }],
}]

function assessment(overrides: Partial<SemanticAssessment> = {}): SemanticAssessment {
  return {
    candidateId: 'node-1',
    directRelevance: 0.8,
    situationalUsefulness: 0.7,
    semanticRelevance: 0.9,
    contextFactIds: ['calendar:exam'],
    evidenceIds: ['node-1:e0'],
    whyToday: 'The Physics test is tomorrow.',
    keyIdea: 'Alternate related problem types to strengthen discrimination.',
    ...overrides,
  }
}

describe('validateSemanticAssessments', () => {
  it('keeps an assessment only when both current context and page-content evidence resolve', () => {
    expect(validateSemanticAssessments([assessment()], context, documents)).toHaveLength(1)
    expect(validateSemanticAssessments([
      assessment({ contextFactIds: ['invented:fact'] }),
      assessment({ evidenceIds: ['node-1:invented'] }),
    ], context, documents)).toEqual([])
  })

  it('rejects missing content, empty explanations, and scores outside zero-to-one', () => {
    expect(validateSemanticAssessments([
      assessment({ directRelevance: 1.2 }),
      assessment({ whyToday: '' }),
      assessment({ keyIdea: '' }),
    ], context, documents)).toEqual([])
  })
})
