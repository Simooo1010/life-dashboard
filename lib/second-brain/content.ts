import type { KnowledgeDocument, KnowledgeEvidence, KnowledgeNode } from './types'
import { fetchPageContent } from '../notion/blocks'

const MAX_EVIDENCE_LENGTH = 700
const MAX_EXCERPT_LENGTH = 1_600

function splitLongSection(section: string): string[] {
  if (section.length <= MAX_EVIDENCE_LENGTH) return [section]
  const lines = section.split('\n')
  const chunks: string[] = []
  let current = ''

  for (const line of lines) {
    if (current && current.length + line.length + 1 > MAX_EVIDENCE_LENGTH) {
      chunks.push(current.trim())
      current = ''
    }
    current += `${current ? '\n' : ''}${line}`
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function buildKnowledgeDocument(node: KnowledgeNode, rawContent: string): KnowledgeDocument {
  const content = rawContent.replace(/\r\n/g, '\n').trim()
  if (!content) {
    return { nodeId: node.id, revision: node.lastEditedAt, content: '', excerpt: '', evidence: [] }
  }

  const sections = content
    .split(/\n\s*\n/g)
    .flatMap(splitLongSection)
    .map(section => section.trim())
    .filter(Boolean)

  const evidence: KnowledgeEvidence[] = sections.map((text, index) => ({
    id: `${node.id}:e${index}`,
    text,
  }))

  return {
    nodeId: node.id,
    revision: node.lastEditedAt,
    content,
    excerpt: content.length > MAX_EXCERPT_LENGTH
      ? `${content.slice(0, MAX_EXCERPT_LENGTH).trimEnd()}…`
      : content,
    evidence,
  }
}

export interface KnowledgeContentCache {
  getContent(pageId: string, revision: string): Promise<KnowledgeDocument | null>
  putContent(document: KnowledgeDocument): Promise<void>
}

export interface KnowledgeContentRefreshResult {
  documents: KnowledgeDocument[]
  failures: Array<{ nodeId: string; message: string }>
}

export async function refreshKnowledgeDocuments(
  nodes: KnowledgeNode[],
  cache: KnowledgeContentCache,
  readContent: (pageId: string) => Promise<string> = fetchPageContent,
  concurrency = 3,
): Promise<KnowledgeContentRefreshResult> {
  const documents = new Map<string, KnowledgeDocument>()
  const failures: Array<{ nodeId: string; message: string }> = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < nodes.length) {
      const node = nodes[nextIndex++]
      try {
        let cached: KnowledgeDocument | null = null
        try {
          cached = await cache.getContent(node.id, node.lastEditedAt)
        } catch {
          // A cache failure must not prevent a fresh authoritative Notion read.
        }
        if (cached) {
          documents.set(node.id, cached)
          continue
        }

        const document = buildKnowledgeDocument(node, await readContent(node.id))
        documents.set(node.id, document)
        try {
          await cache.putContent(document)
        } catch {
          // Derived cache persistence is best-effort; the fresh document remains valid.
        }
      } catch (error) {
        failures.push({
          nodeId: node.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, nodes.length)) }, worker))

  return {
    documents: nodes.flatMap(node => documents.get(node.id) ?? []),
    failures,
  }
}
