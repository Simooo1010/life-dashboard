import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { LifeOsSnapshot, LifeOsSourceStatus } from '@/lib/life-os/types'
import { normalizeLifeOsPage } from './life-os-schema'
import { NOTION_PAGES, notion } from './client'

interface PaginatedResponse { results: unknown[]; has_more: boolean; next_cursor: string | null }
export interface LifeOsNotionClient {
  pages: { retrieve(args: { page_id: string }): Promise<unknown> }
  blocks: { children: { list(args: { block_id: string; page_size?: number; start_cursor?: string }): Promise<PaginatedResponse> } }
  databases: {
    retrieve(args: { database_id: string }): Promise<unknown>
    query(args: { database_id: string; page_size?: number; start_cursor?: string }): Promise<PaginatedResponse>
  }
}
export interface FetchLifeOsOptions { client?: LifeOsNotionClient; rootPageId?: string; databaseIds?: string[]; schoolDatabaseIds?: string[]; logDatabaseIds?: string[] }
interface UnknownRecord { [key: string]: unknown }
function isRecord(value: unknown): value is UnknownRecord { return typeof value === 'object' && value !== null }
function isFullPageValue(value: unknown): value is PageObjectResponse {
  return isRecord(value) && value.object === 'page' && typeof value.id === 'string' && isRecord(value.properties) && typeof value.url === 'string'
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Errore non specificato.' }
function envIds(name: string): string[] { return (process.env[name] ?? '').split(',').map(value => value.trim()).filter(Boolean) }

async function listAllBlocks(client: LifeOsNotionClient, blockId: string): Promise<unknown[]> {
  const results: unknown[] = []
  let cursor: string | undefined
  do {
    const response = await client.blocks.children.list({ block_id: blockId, page_size: 100, start_cursor: cursor })
    results.push(...response.results)
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)
  return results
}

export async function discoverLifeOsDatabaseIds(client: LifeOsNotionClient, rootPageId: string): Promise<string[]> {
  const found = new Set<string>()
  const visited = new Set<string>()
  const queue = [{ id: rootPageId, depth: 0 }]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current.id) || current.depth > 4) continue
    visited.add(current.id)
    for (const value of await listAllBlocks(client, current.id)) {
      if (!isRecord(value) || typeof value.id !== 'string') continue
      if (value.type === 'child_database') found.add(value.id)
      if (value.has_children === true && current.depth < 4) queue.push({ id: value.id, depth: current.depth + 1 })
    }
  }
  return [...found]
}

async function queryAllPages(client: LifeOsNotionClient, databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined
  do {
    const response = await client.databases.query({ database_id: databaseId, page_size: 100, start_cursor: cursor })
    response.results.forEach(result => { if (isFullPageValue(result)) pages.push(result) })
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)
  return pages
}

function titleFromRichText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.map(part => isRecord(part) && typeof part.plain_text === 'string' ? part.plain_text : '').join('').trim()
}
function pageTitle(value: unknown): string {
  if (!isFullPageValue(value)) return ''
  const title = Object.values(value.properties).find(property => property.type === 'title')
  return title?.type === 'title' ? titleFromRichText(title.title) : ''
}
function databaseTitle(value: unknown, databaseId: string): string { return isRecord(value) ? titleFromRichText(value.title) || databaseId : databaseId }
function databaseRole(databaseId: string, label: string, schoolIds: ReadonlySet<string>, logIds: ReadonlySet<string>): 'general' | 'school' | 'log' {
  if (schoolIds.has(databaseId)) return 'school'
  if (logIds.has(databaseId)) return 'log'
  const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/scuol|school|compit|verif|interrog|materi|orario|assess/.test(normalized)) return 'school'
  if (/log|sync|sistema|system|source|fonti/.test(normalized)) return 'log'
  return 'general'
}

function collectRelationIds(pages: PageObjectResponse[]): string[] {
  const ids = new Set<string>()
  pages.forEach(page => Object.values(page.properties).forEach(property => { if (property.type === 'relation') property.relation.forEach(relation => ids.add(relation.id)) }))
  return [...ids]
}
async function resolveRelationTitles(client: LifeOsNotionClient, pages: PageObjectResponse[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  const relationIds = collectRelationIds(pages)
  const results = await Promise.allSettled(relationIds.map(id => client.pages.retrieve({ page_id: id })))
  results.forEach((result, index) => { if (result.status === 'fulfilled') { const title = pageTitle(result.value); if (title) titles.set(relationIds[index], title) } })
  return titles
}
function sourceStatus(sourceId: string | undefined, label: string, state: LifeOsSourceStatus['state'], checkedAt: string, message?: string): LifeOsSourceStatus {
  return { source: 'notion', sourceId, label, state, checkedAt, message }
}

export async function fetchLifeOsData(options: FetchLifeOsOptions = {}): Promise<LifeOsSnapshot> {
  const checkedAt = new Date().toISOString()
  const rootPageId = options.rootPageId ?? NOTION_PAGES.lifeOsManaging
  const client = options.client ?? notion as unknown as LifeOsNotionClient
  const pageUrl = `https://app.notion.com/p/Life-OS-Managing-${rootPageId.replace(/-/g, '')}`
  const unavailable = (message: string): LifeOsSnapshot => ({ pageUrl, title: 'Life OS Managing', items: [], schedule: [], sources: [sourceStatus(undefined, 'Notion · Life OS', 'unavailable', checkedAt, message)], fetchedAt: checkedAt })
  if (!options.client && !process.env.NOTION_TOKEN && !process.env.NOTION_TOKEN_SECOND_BRAIN) return unavailable('Token Notion non configurato.')
  let rootPage: unknown
  try { rootPage = await client.pages.retrieve({ page_id: rootPageId }) } catch (error) { return unavailable(errorMessage(error)) }

  let discoveredIds: string[] = []
  let discoveryError: string | undefined
  try { discoveredIds = await discoverLifeOsDatabaseIds(client, rootPageId) } catch (error) { discoveryError = errorMessage(error) }
  const generalIds = options.databaseIds ?? envIds('NOTION_LIFE_OS_DATABASE_IDS')
  const schoolIds = new Set(options.schoolDatabaseIds ?? envIds('NOTION_LIFE_OS_SCHOOL_DATABASE_IDS'))
  const logIds = new Set(options.logDatabaseIds ?? envIds('NOTION_LIFE_OS_LOG_DATABASE_IDS'))
  const databaseIds = [...new Set([...discoveredIds, ...generalIds, ...schoolIds, ...logIds])]
  const sources: LifeOsSourceStatus[] = []
  const items: LifeOsSnapshot['items'] = []
  const schedule: LifeOsSnapshot['schedule'] = []
  if (databaseIds.length === 0) sources.push(sourceStatus(undefined, 'Notion · Life OS', discoveryError ? 'partial' : 'empty', checkedAt, discoveryError ?? 'Nessun database accessibile trovato nella pagina.'))

  for (const databaseId of databaseIds) {
    let label = databaseId
    try {
      label = databaseTitle(await client.databases.retrieve({ database_id: databaseId }), databaseId)
      const pages = await queryAllPages(client, databaseId)
      const relationTitles = await resolveRelationTitles(client, pages)
      const role = databaseRole(databaseId, label, schoolIds, logIds)
      pages.forEach(page => { const normalized = normalizeLifeOsPage(page, relationTitles, role); if (normalized.item) items.push(normalized.item); if (normalized.scheduleEntry) schedule.push(normalized.scheduleEntry) })
      sources.push(sourceStatus(databaseId, `Notion · ${label}`, pages.length === 0 ? 'empty' : 'available', checkedAt))
    } catch (error) { sources.push(sourceStatus(databaseId, `Notion · ${label}`, 'partial', checkedAt, errorMessage(error))) }
  }
  return { pageUrl, title: pageTitle(rootPage) || 'Life OS Managing', items, schedule, sources, fetchedAt: checkedAt }
}
