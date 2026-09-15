import { describe, expect, it } from 'vitest'
import type { DailyContext } from '../daily-context/types'
import {
  getContextualSecondBrain,
  selectKnowledgeCandidates,
  type SecondBrainServiceDependencies,
} from './service'
import type { KnowledgeDocument, KnowledgeNode, SecondBrainResult } from './types'

function context(hash = 'context-a'): DailyContext {
  return {
    localDate: '2026-09-13', timeZone: 'Europe/Rome', contextHash: hash,
    facts: [{ id: 'calendar:exam', source: 'calendar', kind: 'school', title: 'Physics test', detail: 'Tomorrow', occursAt: '2026-09-14', urgency: 'soon', sourceUrl: null, tokens: ['physics', 'test'] }],
    workload: { todayCount: 0, nextThreeDaysCount: 1, assessmentCount: 1, concentration: 'low' }, sourceStatuses: [],
  }
}

const node: KnowledgeNode = {
  id: 'node-1', concept: 'Interleaving', category: 'Learning', lastUpdated: '2026-01-01',
  lastEditedAt: '2026-01-01T00:00:00.000Z', relatedIds: [], sourceMaterials: ['Make It Stick'],
  truthChecked: 'verified', url: 'https://notion.so/node-1',
}

const document: KnowledgeDocument = {
  nodeId: 'node-1', revision: node.lastEditedAt,
  content: 'Interleaving alternates related physics problem types to improve durable discrimination.',
  excerpt: 'Interleaving alternates related physics problem types to improve durable discrimination.',
  evidence: [{ id: 'node-1:e0', text: 'Interleaving alternates related physics problem types to improve durable discrimination.' }],
}

function dependencies(cached: SecondBrainResult | null = null) {
  const state = { assessCalls: 0, historyWrites: 0, runWrites: 0 }
  const deps: SecondBrainServiceDependencies = {
    fetchIndex: async () => [node],
    refreshDocuments: async () => ({ documents: [document], failures: [] }),
    assess: async () => {
      state.assessCalls += 1
      return { assessments: [{
        candidateId: 'node-1', directRelevance: 0.9, situationalUsefulness: 0.8, semanticRelevance: 0.9,
        contextFactIds: ['calendar:exam'], evidenceIds: ['node-1:e0'],
        whyToday: 'The Physics test is tomorrow.', keyIdea: 'Alternate related physics problems.',
      }], usedFallback: false }
    },
    repository: {
      getContent: async () => null, putContent: async () => undefined,
      getRun: async () => cached, putRun: async () => { state.runWrites += 1 },
      getHistory: async () => [], recordHistory: async () => { state.historyWrites += 1 },
    },
    now: () => new Date('2026-09-13T08:00:00.000Z'),
  }
  return { deps, state }
}

describe('getContextualSecondBrain', () => {
  it('coalesces concurrent recommendation work for the same context and graph', async () => {
    const { deps, state } = dependencies()

    const [first, second] = await Promise.all([
      getContextualSecondBrain(context(), { dependencies: deps }),
      getContextualSecondBrain(context(), { dependencies: deps }),
    ])

    expect(first.relevantToday.map(item => item.id)).toEqual(['node-1'])
    expect(second.relevantToday.map(item => item.id)).toEqual(['node-1'])
    expect(state).toEqual({ assessCalls: 1, historyWrites: 1, runWrites: 1 })
  })

  it('reuses a recent in-memory result when persistent caching is unavailable', async () => {
    const { deps, state } = dependencies()

    await getContextualSecondBrain(context(), { dependencies: deps })
    const repeated = await getContextualSecondBrain(context(), { dependencies: deps })

    expect(repeated.fromCache).toBe(true)
    expect(state).toEqual({ assessCalls: 1, historyWrites: 1, runWrites: 1 })
  })

  it('persists and records a newly grounded recommendation run once', async () => {
    const { deps, state } = dependencies()
    const result = await getContextualSecondBrain(context(), { dependencies: deps })

    expect(result.relevantToday.map(item => item.id)).toEqual(['node-1'])
    expect(result.relevantToday[0].whyToday).toBe('The Physics test is tomorrow.')
    expect(state).toEqual({ assessCalls: 1, historyWrites: 1, runWrites: 1 })
  })

  it('reuses a graph index that the page already fetched', async () => {
    const { deps, state } = dependencies()
    const result = await getContextualSecondBrain(context('prefetched'), {
      dependencies: {
        ...deps,
        fetchIndex: async () => { throw new Error('duplicate graph request') },
      },
      prefetchedNodes: [node],
    })

    expect(result.relevantToday.map(item => item.id)).toEqual(['node-1'])
    expect(state.assessCalls).toBe(1)
  })

  it('uses grounded deterministic ranking on the latency-sensitive page-load path', async () => {
    const { deps, state } = dependencies()
    const result = await getContextualSecondBrain(context('fast'), {
      dependencies: deps,
      fastMode: true,
    })

    expect(result.relevantToday.map(item => item.id)).toEqual(['node-1'])
    expect(state.assessCalls).toBe(0)
    expect(result.sourceStatuses).toContainEqual(expect.objectContaining({
      source: 'semantic-ranking',
      state: 'partial',
    }))
  })

  it('reuses the exact context and graph run without adding another history event', async () => {
    const cached: SecondBrainResult = {
      relevantToday: [], rediscover: [], generatedAt: '2026-09-13T07:00:00.000Z', contextHash: 'context-a',
      knowledgeRevisionHash: 'graph', sourceStatuses: [], fromCache: false,
    }
    const { deps, state } = dependencies(cached)
    const result = await getContextualSecondBrain(context(), { dependencies: deps })

    expect(result.fromCache).toBe(true)
    expect(state).toEqual({ assessCalls: 0, historyWrites: 0, runWrites: 0 })
  })
})

describe('selectKnowledgeCandidates', () => {
  it('bounds cold Notion page reads while retaining directly relevant concepts', () => {
    const nodes = Array.from({ length: 20 }, (_, index): KnowledgeNode => ({
      ...node,
      id: `node-${index}`,
      concept: index === 17 ? 'Physics practice' : `Unrelated concept ${index}`,
      lastEditedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    }))

    const selected = selectKnowledgeCandidates(context('selection'), nodes)

    expect(selected).toHaveLength(4)
    expect(selected.map(candidate => candidate.id)).toContain('node-17')
  })
})
