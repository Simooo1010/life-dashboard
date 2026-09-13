import type { DailyContext } from '@/lib/daily-context/types'
import type {
  GroundedAssessment,
  KnowledgeDocument,
  SemanticAssessment,
} from './types'

function validScore(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

export function validateSemanticAssessments(
  assessments: SemanticAssessment[],
  context: DailyContext,
  documents: KnowledgeDocument[],
): GroundedAssessment[] {
  const factIds = new Set(context.facts.map(fact => fact.id))
  const documentByNode = new Map(documents.map(document => [document.nodeId, document]))

  return assessments.filter(assessment => {
    const document = documentByNode.get(assessment.candidateId)
    if (!document?.content.trim() || document.evidence.length === 0) return false
    if (!assessment.whyToday.trim() || !assessment.keyIdea.trim()) return false
    if (![assessment.directRelevance, assessment.situationalUsefulness, assessment.semanticRelevance].every(validScore)) {
      return false
    }
    if (assessment.contextFactIds.length === 0 || !assessment.contextFactIds.every(id => factIds.has(id))) {
      return false
    }

    const evidenceIds = new Set(document.evidence.map(evidence => evidence.id))
    return assessment.evidenceIds.length > 0 && assessment.evidenceIds.every(id => evidenceIds.has(id))
  })
}
