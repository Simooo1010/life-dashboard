import type {
  GroundedAssessment,
  KnowledgeDocument,
  KnowledgeNode,
  RankedRecommendation,
  RecommendationHistoryEntry,
} from './types'

export interface RankingInput {
  nodes: KnowledgeNode[]
  documents: KnowledgeDocument[]
  assessments: GroundedAssessment[]
  history: RecommendationHistoryEntry[]
  localDate: string
  maxResults?: number
}

const MIN_RELEVANCE_SCORE = 0.52

function baseScore(assessment: GroundedAssessment): number {
  return (
    assessment.directRelevance * 0.30
    + assessment.situationalUsefulness * 0.25
    + assessment.semanticRelevance * 0.30
  )
}

function qualityScore(node: KnowledgeNode): number {
  const truth = node.truthChecked === 'verified' ? 0.035 : 0
  const sources = node.sourceMaterials.length > 0 ? 0.025 : 0
  return truth + sources
}

function recencyScore(node: KnowledgeNode, localDate: string): number {
  const edited = new Date(node.lastEditedAt)
  const today = new Date(`${localDate}T12:00:00.000Z`)
  if (Number.isNaN(edited.getTime())) return 0
  const ageDays = Math.max(0, Math.floor((today.getTime() - edited.getTime()) / 86_400_000))
  if (ageDays <= 7) return 0.02
  if (ageDays <= 30) return 0.01
  return 0
}

function dayDistance(earlierDate: string, laterDate: string): number {
  const earlier = Date.parse(`${earlierDate}T12:00:00.000Z`)
  const later = Date.parse(`${laterDate}T12:00:00.000Z`)
  return Math.floor((later - earlier) / 86_400_000)
}

function repetitionPenalty(
  pageId: string,
  history: RecommendationHistoryEntry[],
  localDate: string,
): number {
  const distinctRecentDays = Array.from(new Set(
    history
      .filter(entry => entry.pageId === pageId)
      .map(entry => dayDistance(entry.date, localDate))
      .filter(days => days >= 1 && days <= 14),
  ))
  if (distinctRecentDays.length === 0) return 0

  const mostRecent = Math.min(...distinctRecentDays)
  const proximity = mostRecent <= 3 ? 0.10 : mostRecent <= 7 ? 0.06 : 0.025
  const frequency = Math.min(0.06, Math.max(0, distinctRecentDays.length - 1) * 0.025)
  return proximity + frequency
}

function graphScore(
  node: KnowledgeNode,
  nodes: KnowledgeNode[],
  assessments: Map<string, GroundedAssessment>,
): { score: number; relatedConcept?: string } {
  const related = nodes.filter(candidate => (
    candidate.id !== node.id
    && (node.relatedIds.includes(candidate.id) || candidate.relatedIds.includes(node.id))
  ))
  const strongest = related
    .map(candidate => ({ candidate, strength: baseScore(assessments.get(candidate.id) ?? {
      candidateId: candidate.id,
      directRelevance: 0,
      situationalUsefulness: 0,
      semanticRelevance: 0,
      contextFactIds: [],
      evidenceIds: [],
      whyToday: '',
      keyIdea: '',
    }) }))
    .sort((a, b) => b.strength - a.strength)[0]

  if (!strongest || strongest.strength < 0.55) return { score: 0 }
  return { score: Math.min(0.07, strongest.strength * 0.08), relatedConcept: strongest.candidate.concept }
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function expandGraphCandidates(seedIds: string[], graph: KnowledgeNode[]): string[] {
  const nodes = new Map(graph.map(node => [node.id, node]))
  const expanded = new Set(seedIds)
  for (const seedId of seedIds) {
    for (const relatedId of nodes.get(seedId)?.relatedIds ?? []) {
      if (nodes.has(relatedId)) expanded.add(relatedId)
    }
  }
  return Array.from(expanded)
}

export function rankRecommendations(input: RankingInput): RankedRecommendation[] {
  const documentIds = new Set(
    input.documents
      .filter(document => document.content.trim().length >= 40 && document.evidence.length > 0)
      .map(document => document.nodeId),
  )
  const nodeById = new Map(input.nodes.map(node => [node.id, node]))
  const assessmentById = new Map(input.assessments.map(assessment => [assessment.candidateId, assessment]))

  const ranked = input.assessments.flatMap(assessment => {
    const node = nodeById.get(assessment.candidateId)
    if (!node || !documentIds.has(node.id)) return []

    const graph = graphScore(node, input.nodes, assessmentById)
    const quality = qualityScore(node)
    const recency = recencyScore(node, input.localDate)
    const penalty = repetitionPenalty(node.id, input.history, input.localDate)
    const score = baseScore(assessment) + graph.score + quality + recency - penalty
    if (score < MIN_RELEVANCE_SCORE) return []

    return [{
      id: node.id,
      concept: node.concept,
      category: node.category,
      whyToday: assessment.whyToday,
      keyIdea: assessment.keyIdea,
      url: node.url,
      relatedConcept: graph.relatedConcept,
      sourceMaterials: node.sourceMaterials,
      truthChecked: node.truthChecked,
      score: roundScore(score),
      scoreBreakdown: {
        direct: assessment.directRelevance,
        situational: assessment.situationalUsefulness,
        semantic: assessment.semanticRelevance,
        graph: roundScore(graph.score),
        quality,
        recency,
        repetitionPenalty: penalty,
      },
      contextFactIds: assessment.contextFactIds,
      evidenceIds: assessment.evidenceIds,
    } satisfies RankedRecommendation]
  }).sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept))

  const selected: RankedRecommendation[] = []
  const categoryCounts = new Map<string, number>()
  for (const recommendation of ranked) {
    const category = recommendation.category ?? 'Uncategorized'
    if ((categoryCounts.get(category) ?? 0) >= 2) continue
    selected.push(recommendation)
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    if (selected.length >= (input.maxResults ?? 5)) break
  }
  return selected
}
