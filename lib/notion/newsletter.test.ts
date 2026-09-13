import { describe, expect, it } from 'vitest'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { normalizeNewsletterBlocks } from './newsletter'

function block(id: string, type: 'heading_1' | 'heading_2' | 'paragraph' | 'bulleted_list_item', text: string): BlockObjectResponse {
  return {
    object: 'block', id, parent: { type: 'page_id', page_id: 'page' }, type,
    created_time: '', last_edited_time: '', created_by: { object: 'user', id: 'u' }, last_edited_by: { object: 'user', id: 'u' },
    has_children: false, archived: false, in_trash: false,
    [type]: { rich_text: [{ type: 'text', text: { content: text, link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, plain_text: text, href: null }], color: 'default', is_toggleable: false },
  } as BlockObjectResponse
}

describe('normalizeNewsletterBlocks', () => {
  it('preserves reading order and active heading context', () => {
    const result = normalizeNewsletterBlocks([
      block('h1', 'heading_1', 'Current Project State'),
      block('phase', 'paragraph', 'Phase: Foundation'),
      block('h2', 'heading_2', 'Confirmed decisions'),
      block('decision', 'bulleted_list_item', 'Use Substack first'),
    ])

    expect(result.map(entry => ({ id: entry.id, path: entry.headingPath }))).toEqual([
      { id: 'h1', path: ['Current Project State'] },
      { id: 'phase', path: ['Current Project State'] },
      { id: 'h2', path: ['Current Project State', 'Confirmed decisions'] },
      { id: 'decision', path: ['Current Project State', 'Confirmed decisions'] },
    ])
  })

  it('omits non-text visual blocks so they cannot be cited as evidence', () => {
    const divider = { ...block('empty', 'paragraph', ''), type: 'divider', divider: {} } as unknown as BlockObjectResponse
    expect(normalizeNewsletterBlocks([divider])).toEqual([])
  })
})
