import Groq from 'groq-sdk'
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'
import type { DailyContext } from '../daily-context/types'
import { tokenizeContext } from '../daily-context/build'
import type { KnowledgeDocument, KnowledgeNode, SemanticAssessment } from './types'

type GroqReasoningRequest = ChatCompletionCreateParamsNonStreaming & {
  reasoning_effort: 'none'
  reasoning_format: 'hidden'
}

export interface SemanticAssessmentResult {
  assessments: SemanticAssessment[]
  usedFallback: boolean
  message?: string
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function assessmentFromUnknown(value: unknown): SemanticAssessment | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const numbers = [record.directRelevance, record.situationalUsefulness, record.semanticRelevance]
  if (
    typeof record.candidateId !== 'string'
    || !numbers.every(number => typeof number === 'number')
    || !isStringArray(record.contextFactIds)
    || !isStringArray(record.evidenceIds)
    || typeof record.whyToday !== 'string'
    || typeof record.keyIdea !== 'string'
  ) return null

  return {
    candidateId: record.candidateId,
    directRelevance: record.directRelevance as number,
    situationalUsefulness: record.situationalUsefulness as number,
    semanticRelevance: record.semanticRelevance as number,
    contextFactIds: record.contextFactIds,
    evidenceIds: record.evidenceIds,
    whyToday: record.whyToday,
    keyIdea: record.keyIdea,
  }
}

export function parseSemanticAssessments(raw: string): SemanticAssessment[] {
  try {
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(clean) as { assessments?: unknown }
    if (!Array.isArray(parsed.assessments)) return []
    return parsed.assessments.flatMap(value => assessmentFromUnknown(value) ?? [])
  } catch {
    return []
  }
}

function firstEvidence(document: KnowledgeDocument) {
  return document.evidence.find(evidence => evidence.text.trim().length >= 30)
}

function conciseEvidence(text: string): string {
  const normalized = text.replace(/^#{1,3}\s*/gm, '').replace(/^[-▸>]\s*/gm, '').replace(/\s+/g, ' ').trim()
  return normalized.length > 280 ? `${normalized.slice(0, 277).trim()}…` : normalized
}

const HIGH_LOAD_CONTENT = /\b(cognitive load|focus|priorit|attention|decision|deep work|energy|mental load|carico cognitivo|concentraz|attenzione|priorit[aà]|decision)\b/i

export function buildFallbackAssessments(
  context: DailyContext,
  nodes: KnowledgeNode[],
  documents: KnowledgeDocument[],
): SemanticAssessment[] {
  if (context.facts.length === 0) return []
  const allContextTokens = new Set(context.facts.flatMap(fact => fact.tokens))
  const nodeById = new Map(nodes.map(node => [node.id, node]))

  return documents.flatMap(document => {
    const node = nodeById.get(document.nodeId)
    const evidence = firstEvidence(document)
    if (!node || !evidence) return []
    const candidateTokens = new Set(tokenizeContext(`${node.concept} ${node.category ?? ''} ${document.content}`))
    const overlap = Array.from(allContextTokens).filter(token => candidateTokens.has(token))
    const situational = context.workload.concentration === 'high' && HIGH_LOAD_CONTENT.test(document.content)
    if (overlap.length === 0 && !situational) return []

    const matchedFact = context.facts.find(fact => fact.tokens.some(token => candidateTokens.has(token))) ?? context.facts[0]
    const factDetail = matchedFact.detail ? ` (${matchedFact.detail})` : ''
    const whyToday = situational && overlap.length === 0
      ? `Oggi il carico è ${context.workload.concentration}: ${matchedFact.title}${factDetail}.`
      : `È collegato a ${matchedFact.title}${factDetail}, presente nel contesto reale di oggi.`

    return [{
      candidateId: node.id,
      directRelevance: overlap.length > 0 ? Math.min(0.9, 0.55 + overlap.length * 0.08) : 0.25,
      situationalUsefulness: situational ? 0.9 : 0.55,
      semanticRelevance: situational ? 0.75 : 0.65,
      contextFactIds: [matchedFact.id],
      evidenceIds: [evidence.id],
      whyToday,
      keyIdea: conciseEvidence(evidence.text),
    }]
  })
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

function buildPrompt(context: DailyContext, nodes: KnowledgeNode[], documents: KnowledgeDocument[]): string {
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const candidates = documents.map(document => {
    const node = nodeById.get(document.nodeId)!
    return {
      candidateId: node.id,
      concept: node.concept,
      category: node.category,
      relatedIds: node.relatedIds,
      sourceMaterials: node.sourceMaterials,
      truthChecked: node.truthChecked,
      evidence: document.evidence.slice(0, 6),
    }
  })

  return `Valuta quali concetti già presenti nel Knowledge Graph di Simone sono utili nel contesto reale di oggi.

CONTESTO ATTUALE (usa solo questi fact ID):
${JSON.stringify({ facts: context.facts, workload: context.workload })}

CANDIDATI (usa solo questi candidateId ed evidence ID):
${JSON.stringify(candidates)}

Regole:
- Valuta il contenuto delle evidence, non la sola somiglianza dei titoli.
- La rilevanza situazionale può includere focus, carico cognitivo, decisioni o energia anche senza parole identiche.
- Non generare consigli che non esistono nelle evidence.
- Ometti candidati deboli o privi di un legame concreto.
- "whyToday" deve citare fatti reali del contesto; "keyIdea" deve parafrasare esclusivamente le evidence indicate.
- I punteggi sono numeri tra 0 e 1.

Rispondi solo con JSON:
{"assessments":[{"candidateId":"...","directRelevance":0,"situationalUsefulness":0,"semanticRelevance":0,"contextFactIds":["..."],"evidenceIds":["..."],"whyToday":"...","keyIdea":"..."}]}`
}

export async function assessKnowledgeDocuments(
  context: DailyContext,
  nodes: KnowledgeNode[],
  documents: KnowledgeDocument[],
): Promise<SemanticAssessmentResult> {
  if (context.facts.length === 0 || documents.length === 0) return { assessments: [], usedFallback: false }
  if (!process.env.GROQ_API_KEY) {
    return { assessments: buildFallbackAssessments(context, nodes, documents), usedFallback: true, message: 'GROQ_API_KEY unavailable' }
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const assessments: SemanticAssessment[] = []
  let usedFallback = false

  for (const batch of chunks(documents, 12)) {
    const batchNodes = batch.flatMap(document => nodeById.get(document.nodeId) ?? [])
    try {
      const request: GroqReasoningRequest = {
        model: process.env.SECOND_BRAIN_GROQ_MODEL || 'qwen/qwen3.8-27b',
        messages: [{ role: 'user', content: buildPrompt(context, batchNodes, batch) }],
        temperature: 0.15,
        max_tokens: 2_400,
        response_format: { type: 'json_object' },
        reasoning_effort: 'none',
        reasoning_format: 'hidden',
      }
      const response = await groq.chat.completions.create(request)
      const parsed = parseSemanticAssessments(response.choices[0]?.message?.content ?? '')
      if (parsed.length === 0) throw new Error('Semantic response contained no valid assessments')
      assessments.push(...parsed)
    } catch (error) {
      usedFallback = true
      console.warn('[SecondBrain] Semantic batch fallback:', error)
      assessments.push(...buildFallbackAssessments(context, batchNodes, batch))
    }
  }

  return {
    assessments,
    usedFallback,
    ...(usedFallback ? { message: 'One or more semantic batches used grounded deterministic fallback' } : {}),
  }
}
