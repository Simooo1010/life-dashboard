import { describe, expect, it } from 'vitest'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { discoverLifeOsDatabaseIds, fetchLifeOsData, type LifeOsNotionClient } from './life-os'

function titleProperty(value: string) {
  return { id: 'title', type: 'title' as const, title: [{ type: 'text' as const, text: { content: value, link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' as const }, plain_text: value, href: null }] }
}

function notionPage(id: string, name: string): PageObjectResponse {
  return {
    object: 'page', id, created_time: '2026-09-13T08:00:00.000Z', last_edited_time: '2026-09-13T09:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' }, last_edited_by: { object: 'user', id: 'user-1' }, cover: null, icon: null,
    parent: { type: 'database_id', database_id: 'school-db' }, archived: false, in_trash: false,
    properties: { Nome: titleProperty(name), Tipo: { id: 'type', type: 'select', select: { id: 'homework', name: 'Compiti', color: 'default' } }, Scadenza: { id: 'due', type: 'date', date: { start: '2026-09-15', end: null, time_zone: null } }, Stato: { id: 'status', type: 'status', status: { id: 'open', name: 'Da fare', color: 'default' } } },
    url: `https://www.notion.so/${id}`, public_url: null,
  }
}

function block(id: string, type: string, hasChildren = false) {
  return { object: 'block', id, type, has_children: hasChildren, [type]: { title: id } }
}

describe('Life OS Notion discovery', () => {
  it('finds child databases through nested blocks without duplicates', async () => {
    const client = { blocks: { children: { list: async ({ block_id }: { block_id: string }) => ({ results: block_id === 'root' ? [block('school-db', 'child_database'), block('section', 'child_page', true)] : [block('work-db', 'child_database'), block('school-db', 'child_database')], has_more: false, next_cursor: null }) } } } as unknown as LifeOsNotionClient
    await expect(discoverLifeOsDatabaseIds(client, 'root')).resolves.toEqual(['school-db', 'work-db'])
  })

  it('keeps usable rows when another configured database is inaccessible', async () => {
    const client = {
      pages: { retrieve: async ({ page_id }: { page_id: string }) => ({ ...notionPage(page_id, page_id === 'root' ? 'Life OS Managing' : 'Related'), parent: { type: 'workspace', workspace: true } }) },
      blocks: { children: { list: async () => ({ results: [], has_more: false, next_cursor: null }) } },
      databases: {
        retrieve: async ({ database_id }: { database_id: string }) => ({ id: database_id, title: [{ plain_text: database_id === 'school-db' ? 'Scuola' : 'Privato' }] }),
        query: async ({ database_id }: { database_id: string }) => {
          if (database_id === 'blocked-db') throw new Error('permission denied')
          return { results: [notionPage('homework-1', 'Esercizi')], has_more: false, next_cursor: null }
        },
      },
    } as unknown as LifeOsNotionClient
    const snapshot = await fetchLifeOsData({ client, rootPageId: 'root', databaseIds: ['school-db', 'blocked-db', 'school-db'], schoolDatabaseIds: ['school-db'] })
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]).toMatchObject({ title: 'Esercizi', sourceDatabaseId: 'school-db' })
    expect(snapshot.sources).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: 'school-db', state: 'available' }), expect.objectContaining({ sourceId: 'blocked-db', state: 'partial' })]))
  })

  it('checks independent databases concurrently', async () => {
    let active = 0
    let maxActive = 0
    const client = {
      pages: { retrieve: async ({ page_id }: { page_id: string }) => ({ ...notionPage(page_id, 'Life OS Managing'), parent: { type: 'workspace', workspace: true } }) },
      blocks: { children: { list: async () => ({ results: [], has_more: false, next_cursor: null }) } },
      databases: {
        retrieve: async ({ database_id }: { database_id: string }) => {
          active += 1
          maxActive = Math.max(maxActive, active)
          await new Promise(resolve => setTimeout(resolve, 10))
          active -= 1
          return { id: database_id, title: [{ plain_text: database_id }] }
        },
        query: async () => ({ results: [], has_more: false, next_cursor: null }),
      },
    } as unknown as LifeOsNotionClient

    await fetchLifeOsData({ client, rootPageId: 'root', databaseIds: ['first-db', 'second-db'] })

    expect(maxActive).toBe(2)
  })
})
