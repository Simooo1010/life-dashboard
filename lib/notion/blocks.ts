import { isFullBlock } from '@notionhq/client'
import type {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { notion } from './client'

const TEXT_BLOCK_PREFIX: Partial<Record<BlockObjectResponse['type'], string>> = {
  heading_1: '# ',
  heading_2: '## ',
  heading_3: '### ',
  bulleted_list_item: '- ',
  numbered_list_item: '1. ',
  quote: '> ',
  to_do: '- ',
  callout: '> ',
  toggle: '▸ ',
  code: '```\n',
}

function richTextToString(items: RichTextItemResponse[]): string {
  const text = items.map(item => item.plain_text).join('').trim()
  const links = Array.from(new Set(items.map(item => item.href).filter((href): href is string => Boolean(href))))
  return links.length > 0 && text ? `${text} ${links.map(link => `[${link}]`).join(' ')}` : text
}

function getRichText(block: BlockObjectResponse): RichTextItemResponse[] {
  const blockRecord = block as unknown as Record<string, unknown>
  const value = blockRecord[block.type]
  if (!value || typeof value !== 'object' || !('rich_text' in value)) return []
  const richText = (value as { rich_text?: unknown }).rich_text
  return Array.isArray(richText) ? richText as RichTextItemResponse[] : []
}

function blockToText(block: BlockObjectResponse): string {
  const text = richTextToString(getRichText(block))
  if (!text) {
    if (block.type === 'bookmark') return block.bookmark.url
    if (block.type === 'link_preview') return block.link_preview.url
    if (block.type === 'child_page') return `## ${block.child_page.title}`
    if (block.type === 'child_database') return `## ${block.child_database.title}`
    return ''
  }

  if (block.type === 'code') return `${TEXT_BLOCK_PREFIX.code}${text}\n\`\`\``
  return `${TEXT_BLOCK_PREFIX[block.type] ?? ''}${text}`
}

export function extractBlockText(blocks: BlockObjectResponse[]): string {
  return blocks
    .map(blockToText)
    .filter(Boolean)
    .join('\n')
    .trim()
}

async function listDirectChildren(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = []
  let cursor: string | undefined

  do {
    const response: ListBlockChildrenResponse = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    })
    blocks.push(...response.results.filter(isFullBlock))
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return blocks
}

export async function listAllBlockChildren(blockId: string): Promise<BlockObjectResponse[]> {
  const directChildren = await listDirectChildren(blockId)
  const flattened: BlockObjectResponse[] = []

  for (const block of directChildren) {
    flattened.push(block)
    if (block.has_children) {
      flattened.push(...await listAllBlockChildren(block.id))
    }
  }

  return flattened
}

export async function fetchPageContent(pageId: string): Promise<string> {
  return extractBlockText(await listAllBlockChildren(pageId))
}
