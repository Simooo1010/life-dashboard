export type TruthCheckState = 'verified' | 'unverified' | 'unknown'

export interface KnowledgeNode {
  id: string
  concept: string
  category: string | null
  lastUpdated: string | null
  lastEditedAt: string
  relatedIds: string[]
  sourceMaterials: string[]
  truthChecked: TruthCheckState
  url: string
}

export interface KnowledgeEvidence {
  id: string
  text: string
}

export interface KnowledgeDocument {
  nodeId: string
  revision: string
  content: string
  excerpt: string
  evidence: KnowledgeEvidence[]
}

export interface RecommendationHistoryEntry {
  pageId: string
  date: string
}

export interface SemanticAssessment {
  candidateId: string
  directRelevance: number
  situationalUsefulness: number
  semanticRelevance: number
  contextFactIds: string[]
  evidenceIds: string[]
  whyToday: string
  keyIdea: string
}

export interface GroundedAssessment extends SemanticAssessment {}

export interface RecommendationScoreBreakdown {
  direct: number
  situational: number
  semantic: number
  graph: number
  quality: number
  recency: number
  repetitionPenalty: number
}

export interface RankedRecommendation {
  id: string
  concept: string
  category: string | null
  whyToday: string
  keyIdea: string
  url: string
  relatedConcept?: string
  sourceMaterials: string[]
  truthChecked: TruthCheckState
  score: number
  scoreBreakdown: RecommendationScoreBreakdown
  contextFactIds: string[]
  evidenceIds: string[]
}

export interface SecondBrainSourceStatus {
  source: 'knowledge-graph' | 'semantic-ranking' | 'history'
  state: 'available' | 'empty' | 'partial' | 'unavailable'
  message?: string
}

export interface SecondBrainResult {
  relevantToday: RankedRecommendation[]
  rediscover: RankedRecommendation[]
  generatedAt: string
  contextHash: string
  knowledgeRevisionHash: string
  sourceStatuses: SecondBrainSourceStatus[]
  fromCache: boolean
}
