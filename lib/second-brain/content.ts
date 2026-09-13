import type { KnowledgeDocument, KnowledgeEvidence, KnowledgeNode } from './types'

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
