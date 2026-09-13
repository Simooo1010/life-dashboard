import { describe, expect, it } from 'vitest'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { extractBlockText } from './blocks'

function richText(content: string, href: string | null = null) {
  return {
    type: 'text' as const,
    text: { content, link: href ? { url: href } : null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default' as const,
    },
    plain_text: content,
    href,
  }
}

function block(
  id: string,
  type: 'heading_2' | 'paragraph' | 'bulleted_list_item' | 'quote' | 'divider',
  text = '',
): BlockObjectResponse {
  const base = {
    object: 'block' as const,
    id,
    parent: { type: 'page_id' as const, page_id: 'page-1' },
    created_time: '2026-09-13T08:00:00.000Z',
    last_edited_time: '2026-09-13T08:00:00.000Z',
    created_by: { object: 'user' as const, id: 'user-1' },
    last_edited_by: { object: 'user' as const, id: 'user-1' },
    has_children: false,
    archived: false,
    in_trash: false,
  }

  if (type === 'divider') return { ...base, type, divider: {} }

  return {
    ...base,
    type,
    [type]: {
      rich_text: [richText(text, type === 'paragraph' ? 'https://example.com' : null)],
      color: 'default',
      is_toggleable: false,
    },
  } as BlockObjectResponse
}

describe('extractBlockText', () => {
  it('keeps substantive page content in reading order and ignores empty blocks', () => {
    const blocks = [
      block('1', 'heading_2', 'Cognitive load'),
      block('2', 'paragraph', 'Reduce the number of simultaneous decisions.'),
      block('3', 'bulleted_list_item', 'Choose the highest-leverage task.'),
      block('4', 'quote', 'Attention is a limited resource.'),
      block('5', 'divider'),
      block('6', 'paragraph', ''),
    ]

    expect(extractBlockText(blocks)).toBe([
      '## Cognitive load',
      'Reduce the number of simultaneous decisions. [https://example.com]',
      '- Choose the highest-leverage task.',
      '> Attention is a limited resource.',
    ].join('\n'))
  })
})
