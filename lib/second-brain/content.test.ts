import { describe, expect, it } from 'vitest'
import { buildKnowledgeDocument } from './content'
import type { KnowledgeNode } from './types'

const node: KnowledgeNode = {
  id: 'node-1',
  concept: 'Interleaving',
  category: 'Learning',
  lastUpdated: '2026-09-01',
  lastEditedAt: '2026-09-01T08:00:00.000Z',
  relatedIds: [],
  sourceMaterials: ['Make It Stick'],
  truthChecked: 'verified',
  url: 'https://notion.so/node-1',
}

describe('buildKnowledgeDocument', () => {
  it('builds stable evidence chunks from actual page content', () => {
    const document = buildKnowledgeDocument(node, [
      '## Definition',
      'Interleaving alternates related problem types.',
      '',
      '## Use',
      'It is useful when discrimination between methods matters.',
    ].join('\n'))

    expect(document.nodeId).toBe('node-1')
    expect(document.revision).toBe(node.lastEditedAt)
    expect(document.excerpt).toContain('Interleaving alternates')
    expect(document.evidence).toEqual([
      { id: 'node-1:e0', text: '## Definition\nInterleaving alternates related problem types.' },
      { id: 'node-1:e1', text: '## Use\nIt is useful when discrimination between methods matters.' },
    ])
  })

  it('returns no evidence for a page without substantive content', () => {
    expect(buildKnowledgeDocument(node, '  \n')).toMatchObject({ content: '', excerpt: '', evidence: [] })
  })
})
