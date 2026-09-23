import { createHash } from 'crypto'
import { isFullBlock, isFullPage } from '@notionhq/client'
import type { BlockObjectResponse, ListBlockChildrenResponse, PageObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints'
import { interpretNewsletterProject } from '../newsletter/interpretation'
import type { NewsletterPageContent, NewsletterProjectState, NewsletterSourceBlock } from '../newsletter/types'
import { notion, NOTION_PAGES } from './client'

function plain(items: RichTextItemResponse[] | undefined): string {
  return (items ?? []).map(item => item.plain_text).join('').trim()
}

function textForBlock(block: BlockObjectResponse): string {
  if (block.type === 'child_page') return block.child_page.title.trim()
  if (block.type === 'child_database') return block.child_database.title.trim()
  if (block.type === 'bookmark') return block.bookmark.url
  if (block.type === 'link_preview') return block.link_preview.url
  if (block.type === 'equation') return block.equation.expression.trim()
  if (block.type === 'table_row') return block.table_row.cells.map(plain).filter(Boolean).join(' | ')
  const payload = (block as unknown as Record<string, unknown>)[block.type]
  if (!payload || typeof payload !== 'object' || !('rich_text' in payload)) return ''
  return plain((payload as { rich_text?: RichTextItemResponse[] }).rich_text)
}

export function normalizeNewsletterBlocks(blocks: BlockObjectResponse[]): NewsletterSourceBlock[] {
  const headings: string[] = []
  return blocks.flatMap(block => {
    const text = textForBlock(block)
    if (!text) return []
    const match = block.type.match(/^heading_([123])$/)
    if (match) {
      const level = Number(match[1])
      headings.length = level - 1
      headings[level - 1] = text
    }
    return [{ id: block.id, type: block.type, text, depth: headings.filter(Boolean).length, headingPath: headings.filter(Boolean) }]
  })
}

async function listAllChildren(parentId: string): Promise<BlockObjectResponse[]> {
  const direct: BlockObjectResponse[] = []
  let cursor: string | undefined
  do {
    const response: ListBlockChildrenResponse = await notion.blocks.children.list({ block_id: parentId, page_size: 100, start_cursor: cursor })
    direct.push(...response.results.filter(isFullBlock))
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  const flattened: BlockObjectResponse[] = []
  for (const block of direct) {
    flattened.push(block)
    if (block.has_children) flattened.push(...await listAllChildren(block.id))
  }
  return flattened
}

function pageTitle(page: PageObjectResponse): string {
  for (const property of Object.values(page.properties)) if (property.type === 'title') return plain(property.title)
  return 'Newsletter project'
}

export async function fetchNewsletterPageContent(): Promise<NewsletterPageContent> {
  const page = await notion.pages.retrieve({ page_id: NOTION_PAGES.newsletterBrief })
  if (!isFullPage(page)) throw new Error('The configured Newsletter source is not an accessible Notion page')
  const blocks = normalizeNewsletterBlocks(await listAllChildren(page.id))
  return {
    source: {
      pageId: page.id,
      pageUrl: page.url,
      pageTitle: pageTitle(page),
      lastEditedAt: page.last_edited_time,
      fetchedAt: new Date().toISOString(),
      contentHash: createHash('sha256').update(blocks.map(block => `${block.id}|${block.type}|${block.text}`).join('\n')).digest('hex'),
    },
    blocks,
  }
}

const CACHE_TTL_MS = 5 * 60 * 1000
let cache: { expiresAt: number; value: NewsletterProjectState } | null = null
let inFlight: Promise<NewsletterProjectState> | null = null

export async function fetchNewsletterProjectState(options: { forceRefresh?: boolean } = {}): Promise<NewsletterProjectState> {
  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) return cache.value
  if (!options.forceRefresh && inFlight) return inFlight
  const request = (async () => {
    const value = await interpretNewsletterProject(await fetchNewsletterPageContent())
    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
    return value
  })()
  // A forced fetch is also shared, so callers that run alongside a manual
  // sync reuse its fresh result instead of downloading the page again.
  inFlight = request
  try { return await request } finally { if (inFlight === request) inFlight = null }
}
