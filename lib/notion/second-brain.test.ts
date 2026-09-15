import { describe, expect, it } from 'vitest'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { fetchSecondBrainBundle, normalizeKnowledgePage } from './second-brain'
import { NOTION_DB } from './client'

function page(): PageObjectResponse {
  return {
    object: 'page',
    id: 'node-1',
    created_time: '2026-08-01T08:00:00.000Z',
    last_edited_time: '2026-09-09T19:04:00.000Z',
    created_by: { object: 'user', id: 'user-1' },
    last_edited_by: { object: 'user', id: 'user-1' },
    cover: null,
    icon: null,
    parent: { type: 'database_id', database_id: 'db-1' },
    archived: false,
    in_trash: false,
    properties: {
      Concept: { id: 'title', type: 'title', title: [{
        type: 'text',
        text: { content: 'Cognitive load', link: null },
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' },
        plain_text: 'Cognitive load',
        href: null,
      }] },
      Category: { id: 'cat', type: 'select', select: { id: 'cat-1', name: 'Concept', color: 'blue' } },
      'Related concepts': { id: 'rel', type: 'relation', relation: [{ id: 'node-2' }] },
      'Source material': { id: 'source', type: 'relation', relation: [{ id: 'source-1' }] },
      'Truth-Checked': { id: 'truth', type: 'date', date: { start: '2026-09-08', end: null, time_zone: null } },
      'Last updated': { id: 'updated', type: 'last_edited_time', last_edited_time: '2026-09-09T19:04:00.000Z' },
    },
    url: 'https://notion.so/node-1',
    public_url: null,
  }
}

describe('normalizeKnowledgePage', () => {
  it('reads the live Knowledge Graph property types including date-based Truth-Checked', () => {
    expect(normalizeKnowledgePage(page(), new Map([['source-1', 'Research paper']]))).toEqual({
      id: 'node-1',
      concept: 'Cognitive load',
      category: 'Concept',
      lastUpdated: '2026-09-09T19:04:00.000Z',
      lastEditedAt: '2026-09-09T19:04:00.000Z',
      relatedIds: ['node-2'],
      sourceMaterials: ['Research paper'],
      truthChecked: 'verified',
      url: 'https://notion.so/node-1',
    })
  })

  it('loads the graph and raw sources exactly once for a shared snapshot', async () => {
    const queriedIds: string[] = []
    const query = async (_client: unknown, databaseId: string) => {
      queriedIds.push(databaseId)
      return databaseId === NOTION_DB.knowledgeGraph ? [page()] : []
    }

    const bundle = await fetchSecondBrainBundle(query as never)

    expect(queriedIds).toEqual([NOTION_DB.knowledgeGraph, NOTION_DB.rawSources])
    expect(bundle.nodes.map(node => node.id)).toEqual(['node-1'])
    expect(bundle.rawSources).toEqual([])
  })
})
