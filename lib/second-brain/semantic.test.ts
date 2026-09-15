import { describe, expect, it } from 'vitest'
import type { DailyContext } from '../daily-context/types'
import {
  buildFallbackAssessments,
  buildSemanticPrompt,
  parseSemanticAssessments,
  splitSemanticBatches,
} from './semantic'
import type { KnowledgeDocument, KnowledgeNode } from './types'

const context: DailyContext = {
  localDate: '2026-09-13', timeZone: 'Europe/Rome',
  facts: [{
    id: 'calendar:dense-day', source: 'calendar', kind: 'school', title: 'Physics test and volleyball training',
    detail: 'Two demanding commitments today', occursAt: '2026-09-13T10:00:00', urgency: 'today', sourceUrl: null,
    tokens: ['physics', 'test', 'volleyball', 'training'],
  }],
  workload: { todayCount: 2, nextThreeDaysCount: 5, assessmentCount: 1, concentration: 'high' },
  sourceStatuses: [], contextHash: 'context',
}

function node(id: string, concept: string): KnowledgeNode {
  return {
    id, concept, category: 'Framework', lastUpdated: null, lastEditedAt: '2026-01-01T00:00:00.000Z',
    relatedIds: [], sourceMaterials: [], truthChecked: 'unknown', url: `https://notion.so/${id}`,
  }
}

function document(nodeId: string, text: string): KnowledgeDocument {
  return { nodeId, revision: 'rev', content: text, excerpt: text, evidence: [{ id: `${nodeId}:e0`, text }] }
}

describe('buildFallbackAssessments', () => {
  it('finds situational relevance in actual page content even when the title has no keyword overlap', () => {
    const candidate = node('node-1', 'Operating principle')
    const assessments = buildFallbackAssessments(
      context,
      [candidate],
      [document(candidate.id, 'Reduce cognitive load by choosing one priority before a demanding block of work.')],
    )

    expect(assessments).toHaveLength(1)
    expect(assessments[0]).toMatchObject({ candidateId: 'node-1', contextFactIds: ['calendar:dense-day'], evidenceIds: ['node-1:e0'] })
    expect(assessments[0].keyIdea).toContain('Reduce cognitive load')
  })

  it('does not manufacture an assessment for unrelated stored content', () => {
    const candidate = node('node-2', 'House plants')
    expect(buildFallbackAssessments(
      context,
      [candidate],
      [document(candidate.id, 'Water tropical plants after checking the soil moisture.')],
    )).toEqual([])
  })
})

describe('parseSemanticAssessments', () => {
  it('accepts only structurally complete model assessments', () => {
    const raw = JSON.stringify({ assessments: [{
      candidateId: 'node-1', directRelevance: 0.4, situationalUsefulness: 0.9, semanticRelevance: 0.8,
      contextFactIds: ['calendar:dense-day'], evidenceIds: ['node-1:e0'],
      whyToday: 'The current day contains two demanding commitments.',
      keyIdea: 'Choose one priority before the demanding work block.',
    }, { candidateId: 'broken', semanticRelevance: 'high' }] })

    expect(parseSemanticAssessments(raw)).toHaveLength(1)
  })
})

describe('semantic request budgeting', () => {
  it('splits a large graph into provider-safe batches', () => {
    const documents = Array.from({ length: 12 }, (_, index) => document(`node-${index}`, `Evidence ${index}`))

    expect(splitSemanticBatches(documents).map(batch => batch.length)).toEqual([4, 4, 4])
  })

  it('bounds the evidence copied into one model prompt', () => {
    const candidates = Array.from({ length: 4 }, (_, index) => node(`node-${index}`, `Concept ${index}`))
    const documents = candidates.map(candidate => document(
      candidate.id,
      `${'useful evidence '.repeat(400)}TAIL_MARKER_${candidate.id}`,
    ))

    const prompt = buildSemanticPrompt(context, candidates, documents)

    expect(prompt.length).toBeLessThan(12_000)
    expect(prompt).not.toContain('TAIL_MARKER_')
  })
})
