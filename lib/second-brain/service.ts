import { createHash } from 'node:crypto'
import type { DailyContext } from '../daily-context/types'
import { tokenizeContext } from '../daily-context/build'
import { addLocalDays } from '../life-os/dates'
import { fetchKnowledgeGraphIndex } from '../notion/second-brain'
import { refreshKnowledgeDocuments, type KnowledgeContentRefreshResult } from './content'
import { validateSemanticAssessments } from './grounding'
import { rankRecommendations } from './rank'
import {
  assessKnowledgeDocuments,
  buildFallbackAssessments,
  type SemanticAssessmentResult,
} from './semantic'
import { buildRunCacheKey, secondBrainRepository, type SecondBrainRepository } from './repository'
import type {
  KnowledgeDocument,
  KnowledgeNode,
  RankedRecommendation,
  RecommendationHistoryEntry,
  SecondBrainResult,
} from './types'

const RANKING_VERSION = 'contextual-v1'

export interface SecondBrainServiceDependencies {
  fetchIndex: () => Promise<KnowledgeNode[]>
  refreshDocuments: (
    nodes: KnowledgeNode[],
    repository: SecondBrainRepository,
  ) => Promise<KnowledgeContentRefreshResult>
  assess: (
    context: DailyContext,
    nodes: KnowledgeNode[],
    documents: KnowledgeDocument[],
  ) => Promise<SemanticAssessmentResult>
  repository: SecondBrainRepository
  now: () => Date
}

export interface SecondBrainServiceOptions {
  forceRefresh?: boolean
  fastMode?: boolean
  prefetchedNodes?: KnowledgeNode[]
  dependencies?: SecondBrainServiceDependencies
}

const defaultDependencies: SecondBrainServiceDependencies = {
  fetchIndex: fetchKnowledgeGraphIndex,
  refreshDocuments: (nodes, repository) => refreshKnowledgeDocuments(nodes, repository),
  assess: assessKnowledgeDocuments,
  repository: secondBrainRepository,
  now: () => new Date(),
}

const inFlightRuns = new WeakMap<SecondBrainServiceDependencies, Map<string, Promise<SecondBrainResult>>>()
const memoryRuns = new WeakMap<SecondBrainServiceDependencies, Map<string, { expiresAt: number; result: SecondBrainResult }>>()
const MEMORY_RUN_TTL_MS = 5 * 60 * 1000
const PAGE_LOAD_CANDIDATE_LIMIT = 4

export function selectKnowledgeCandidates(
  context: DailyContext,
  nodes: KnowledgeNode[],
  limit = PAGE_LOAD_CANDIDATE_LIMIT,
): KnowledgeNode[] {
  const contextTokens = new Set(context.facts.flatMap(fact => fact.tokens))
  return nodes
    .map(node => {
      const tokens = tokenizeContext(`${node.concept} ${node.category ?? ''} ${node.sourceMaterials.join(' ')}`)
      const overlap = tokens.filter(token => contextTokens.has(token)).length
      const quality = (node.truthChecked === 'verified' ? 2 : 0) + (node.sourceMaterials.length > 0 ? 1 : 0)
      return { node, score: overlap * 20 + quality }
    })
    .sort((a, b) => (
      b.score - a.score
      || b.node.lastEditedAt.localeCompare(a.node.lastEditedAt)
      || a.node.id.localeCompare(b.node.id)
    ))
    .slice(0, Math.max(1, limit))
    .map(candidate => candidate.node)
}

export function computeKnowledgeRevisionHash(nodes: KnowledgeNode[]): string {
  const revisions = nodes.map(node => ({
    id: node.id,
    revision: node.lastEditedAt,
    relatedIds: [...node.relatedIds].sort(),
    truthChecked: node.truthChecked,
    sourceMaterials: [...node.sourceMaterials].sort(),
  })).sort((a, b) => a.id.localeCompare(b.id))
  return createHash('sha256').update(JSON.stringify(revisions)).digest('hex')
}

function wasRecentlyShown(pageId: string, history: RecommendationHistoryEntry[], localDate: string): boolean {
  const cutoff = addLocalDays(localDate, -7)
  return history.some(entry => entry.pageId === pageId && entry.date >= cutoff && entry.date < localDate)
}

function selectRediscover(
  context: DailyContext,
  nodes: KnowledgeNode[],
  documents: KnowledgeDocument[],
  relevantToday: RankedRecommendation[],
  history: RecommendationHistoryEntry[],
): RankedRecommendation[] {
  if (context.facts.length === 0) return []
  const relevantIds = new Set(relevantToday.map(item => item.id))
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const relevantById = new Map(relevantToday.map(item => [item.id, item]))
  const contextTokens = new Set(context.facts.flatMap(fact => fact.tokens))

  const candidates = documents.flatMap(document => {
    const node = nodeById.get(document.nodeId)
    const evidence = document.evidence.find(item => item.text.trim().length >= 40)
    if (!node || !evidence || relevantIds.has(node.id) || wasRecentlyShown(node.id, history, context.localDate)) return []

    const connected = nodes.find(candidate => (
      relevantIds.has(candidate.id)
      && (node.relatedIds.includes(candidate.id) || candidate.relatedIds.includes(node.id))
    ))
    const documentTokens = new Set(tokenizeContext(`${node.concept} ${document.content}`))
    const matchedFact = context.facts.find(fact => fact.tokens.some(token => documentTokens.has(token)))
    if (!connected && !matchedFact) return []

    const quality = (node.truthChecked === 'verified' ? 0.04 : 0) + (node.sourceMaterials.length > 0 ? 0.03 : 0)
    const topicalOverlap = Array.from(contextTokens).filter(token => documentTokens.has(token)).length
    const score = Math.min(0.7, (connected ? 0.46 : 0.32) + Math.min(0.1, topicalOverlap * 0.02) + quality)
    const contextFactIds = connected
      ? relevantById.get(connected.id)?.contextFactIds ?? []
      : matchedFact ? [matchedFact.id] : []
    if (contextFactIds.length === 0) return []

    const whyToday = connected
      ? `È una connessione diretta di ${connected.concept}, emerso come rilevante nel contesto di oggi.`
      : `Vale la pena riprenderlo per il collegamento con ${matchedFact!.title}, presente nel contesto di oggi.`
    const keyIdea = evidence.text.replace(/\s+/g, ' ').trim().slice(0, 280)

    return [{
      id: node.id,
      concept: node.concept,
      category: node.category,
      whyToday,
      keyIdea,
      url: node.url,
      ...(connected ? { relatedConcept: connected.concept } : {}),
      sourceMaterials: node.sourceMaterials,
      truthChecked: node.truthChecked,
      score: Math.round(score * 1_000) / 1_000,
      scoreBreakdown: {
        direct: 0,
        situational: connected ? 0.7 : 0.5,
        semantic: Math.min(1, topicalOverlap / 3),
        graph: connected ? 0.46 : 0,
        quality,
        recency: 0,
        repetitionPenalty: 0,
      },
      contextFactIds,
      evidenceIds: [evidence.id],
    } satisfies RankedRecommendation]
  }).sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept))

  const selected: RankedRecommendation[] = []
  const categories = new Set<string>()
  for (const candidate of candidates) {
    const category = candidate.category ?? 'Uncategorized'
    if (categories.has(category) && selected.length > 0) continue
    categories.add(category)
    selected.push(candidate)
    if (selected.length === 3) break
  }
  return selected
}

export async function getContextualSecondBrain(
  context: DailyContext,
  options: SecondBrainServiceOptions = {},
): Promise<SecondBrainResult> {
  const dependencies = options.dependencies ?? defaultDependencies
  const nodes = options.prefetchedNodes ?? await dependencies.fetchIndex()
  const knowledgeRevisionHash = computeKnowledgeRevisionHash(nodes)
  const cacheKey = buildRunCacheKey(context.localDate, context.contextHash, knowledgeRevisionHash, RANKING_VERSION)

  if (!options.forceRefresh) {
    const memoryRun = memoryRuns.get(dependencies)?.get(cacheKey)
    if (memoryRun && memoryRun.expiresAt > dependencies.now().getTime()) {
      return { ...memoryRun.result, fromCache: true }
    }
    try {
      const cached = await dependencies.repository.getRun(cacheKey)
      if (cached) {
        const dependencyMemory = memoryRuns.get(dependencies) ?? new Map<string, { expiresAt: number; result: SecondBrainResult }>()
        memoryRuns.set(dependencies, dependencyMemory)
        dependencyMemory.set(cacheKey, { expiresAt: dependencies.now().getTime() + MEMORY_RUN_TTL_MS, result: cached })
        return { ...cached, fromCache: true }
      }
    } catch (error) {
      console.warn('[SecondBrain] Recommendation cache read failed:', error)
    }
  }

  const dependencyRuns = inFlightRuns.get(dependencies) ?? new Map<string, Promise<SecondBrainResult>>()
  inFlightRuns.set(dependencies, dependencyRuns)
  if (!options.forceRefresh) {
    const inFlight = dependencyRuns.get(cacheKey)
    if (inFlight) return inFlight
  }

  const run = (async () => {
    const candidates = selectKnowledgeCandidates(context, nodes, options.fastMode ? 1 : PAGE_LOAD_CANDIDATE_LIMIT)
    const refresh = await dependencies.refreshDocuments(candidates, dependencies.repository)
    let history: RecommendationHistoryEntry[] = []
    try {
      history = await dependencies.repository.getHistory(addLocalDays(context.localDate, -14))
    } catch (error) {
      console.warn('[SecondBrain] History read failed:', error)
    }

    const semantic: SemanticAssessmentResult = options.fastMode
      ? {
          assessments: buildFallbackAssessments(context, candidates, refresh.documents),
          usedFallback: true,
          message: 'Fast grounded ranking used for page load',
        }
      : await dependencies.assess(context, candidates, refresh.documents)
    const grounded = validateSemanticAssessments(semantic.assessments, context, refresh.documents)
    const relevantToday = rankRecommendations({
      nodes,
      documents: refresh.documents,
      assessments: grounded,
      history,
      localDate: context.localDate,
    })
    const rediscover = selectRediscover(context, nodes, refresh.documents, relevantToday, history)

    const result: SecondBrainResult = {
      relevantToday,
      rediscover,
      generatedAt: dependencies.now().toISOString(),
      contextHash: context.contextHash,
      knowledgeRevisionHash,
      sourceStatuses: [
        {
          source: 'knowledge-graph',
          state: nodes.length === 0 ? 'empty' : refresh.failures.length > 0 ? 'partial' : 'available',
          ...(refresh.failures.length > 0 ? { message: `${refresh.failures.length} pagine non aggiornabili` } : {}),
        },
        {
          source: 'semantic-ranking',
          state: semantic.usedFallback ? 'partial' : 'available',
          ...(semantic.message ? { message: semantic.message } : {}),
        },
        { source: 'history', state: 'available' },
      ],
      fromCache: false,
    }

    try {
      await dependencies.repository.putRun(cacheKey, context.localDate, result)
      await dependencies.repository.recordHistory(context.localDate, relevantToday, rediscover)
    } catch (error) {
      console.warn('[SecondBrain] Derived persistence failed:', error)
    }

    return result
  })()

  if (!options.forceRefresh) dependencyRuns.set(cacheKey, run)
  try {
    const result = await run
    const dependencyMemory = memoryRuns.get(dependencies) ?? new Map<string, { expiresAt: number; result: SecondBrainResult }>()
    memoryRuns.set(dependencies, dependencyMemory)
    dependencyMemory.set(cacheKey, { expiresAt: dependencies.now().getTime() + MEMORY_RUN_TTL_MS, result })
    return result
  } finally {
    if (dependencyRuns.get(cacheKey) === run) dependencyRuns.delete(cacheKey)
  }
}
