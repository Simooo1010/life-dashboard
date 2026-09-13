import { describe, expect, it } from 'vitest'
import { buildKnowledgeDocument, refreshKnowledgeDocuments } from './content'
import type { KnowledgeDocument, KnowledgeNode } from './types'

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

describe('refreshKnowledgeDocuments', () => {
  it('reuses a matching Notion revision and refreshes a changed page', async () => {
    const cache = new Map<string, KnowledgeDocument>([[
      'node-1',
      buildKnowledgeDocument(node, 'Cached substantive content that remains valid for the current revision.'),
    ]])
    const changed = { ...node, id: 'node-2', lastEditedAt: '2026-09-13T09:00:00.000Z' }
    const readIds: string[] = []

    const result = await refreshKnowledgeDocuments(
      [node, changed],
      {
        getContent: async (pageId, revision) => cache.get(pageId)?.revision === revision ? cache.get(pageId)! : null,
        putContent: async document => { cache.set(document.nodeId, document) },
      },
      async pageId => {
        readIds.push(pageId)
        return 'Fresh page content retrieved from Notion with enough substance for ranking.'
      },
    )

    expect(readIds).toEqual(['node-2'])
    expect(result.documents.map(document => document.nodeId)).toEqual(['node-1', 'node-2'])
    expect(cache.get('node-2')?.content).toContain('Fresh page content')
    expect(result.failures).toEqual([])
  })

  it('excludes a changed page when its current content cannot be retrieved', async () => {
    const result = await refreshKnowledgeDocuments(
      [node],
      { getContent: async () => null, putContent: async () => undefined },
      async () => { throw new Error('Notion unavailable') },
    )

    expect(result.documents).toEqual([])
    expect(result.failures).toEqual([{ nodeId: 'node-1', message: 'Notion unavailable' }])
  })
})
