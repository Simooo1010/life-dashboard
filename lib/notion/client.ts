import { Client, isFullPage } from '@notionhq/client'
import type { PageObjectResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints'

// ─── Client ───────────────────────────────────────────────────────────────────
// Notion token for Life OS & Second Brain workspace
const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_TOKEN_SECOND_BRAIN

export const notion = new Client({
  auth: notionToken,
})

// Backward-compatible alias
export const notionSecondBrain = notion

// ─── Notion IDs ───────────────────────────────────────────────────────────────
export const NOTION_DB = {
  knowledgeGraph: '39f85136-880f-80b3-b947-fb31814ecdba',
  rawSources: '39f85136-880f-80ee-a1a7-cd49c2447b29',
} as const

export const NOTION_PAGES = {
  lifeOsManaging: '3d985136-880f-80ce-954f-d1d845555c66',
  aiData: '3d985136-880f-8068-ac02-e28ad4f3f523',
  newsletterBrief: '3d585136-880f-81aa-8a9e-ef32ee7fb016',
} as const

// ─── Property extractors ──────────────────────────────────────────────────────
type AnyProperty = PageObjectResponse['properties'][string]

export function getText(prop: AnyProperty | undefined): string {
  if (!prop) return ''
  if (prop.type === 'title') return prop.title.map(t => t.plain_text).join('')
  if (prop.type === 'rich_text') return prop.rich_text.map(t => t.plain_text).join('')
  return ''
}

export function getDate(prop: AnyProperty | undefined): string | null {
  if (!prop || prop.type !== 'date') return null
  return prop.date?.start ?? null
}

export function getSelect(prop: AnyProperty | undefined): string | null {
  if (!prop || prop.type !== 'select') return null
  return prop.select?.name ?? null
}

export function getMultiSelect(prop: AnyProperty | undefined): string[] {
  if (!prop || prop.type !== 'multi_select') return []
  return prop.multi_select.map(s => s.name)
}

export function getCheckbox(prop: AnyProperty | undefined): boolean {
  if (!prop || prop.type !== 'checkbox') return false
  return prop.checkbox
}

export function getNumber(prop: AnyProperty | undefined): number | null {
  if (!prop || prop.type !== 'number') return null
  return prop.number
}

export function getRelationIds(prop: AnyProperty | undefined): string[] {
  if (!prop || prop.type !== 'relation') return []
  return prop.relation.map(r => r.id)
}

export function getUrl(prop: AnyProperty | undefined): string | null {
  if (!prop || prop.type !== 'url') return null
  return prop.url
}

export function getPageId(page: PageObjectResponse): string {
  return page.id
}

// ─── Full query helper with auto-pagination ───────────────────────────────────
export async function queryAll(
  client: Client,
  databaseId: string,
  filter?: Parameters<Client['databases']['query']>[0]['filter'],
  sorts?: Parameters<Client['databases']['query']>[0]['sorts'],
): Promise<PageObjectResponse[]> {
  const results: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const response: QueryDatabaseResponse = await client.databases.query({
      database_id: databaseId,
      filter,
      sorts,
      page_size: 100,
      start_cursor: cursor,
    })

    for (const page of response.results) {
      if (isFullPage(page)) results.push(page)
    }

    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return results
}
