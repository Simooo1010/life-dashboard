import { describe, expect, it } from 'vitest'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { normalizeLifeOsPage } from './life-os-schema'

function richText(content: string) {
  return [{ type: 'text' as const, text: { content, link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' as const }, plain_text: content, href: null }]
}

const title = (value: string) => ({ id: 'title', type: 'title' as const, title: richText(value) })
const select = (value: string) => ({ id: 'select', type: 'select' as const, select: { id: value, name: value, color: 'default' as const } })
const status = (value: string) => ({ id: 'status', type: 'status' as const, status: { id: value, name: value, color: 'default' as const } })
const date = (value: string, end: string | null = null) => ({ id: 'date', type: 'date' as const, date: { start: value, end, time_zone: null } })
const relation = (id: string) => ({ id: 'relation', type: 'relation' as const, relation: [{ id }] })

function page(properties: Record<string, unknown>): PageObjectResponse {
  return {
    object: 'page', id: 'page-1', created_time: '2026-09-13T08:00:00.000Z', last_edited_time: '2026-09-13T09:00:00.000Z',
    created_by: { object: 'user', id: 'user-1' }, last_edited_by: { object: 'user', id: 'user-1' }, cover: null, icon: null,
    parent: { type: 'database_id', database_id: 'database-1' }, archived: false, in_trash: false,
    properties: properties as PageObjectResponse['properties'], url: 'https://www.notion.so/page-1', public_url: null,
  }
}

describe('normalizeLifeOsPage', () => {
  it('normalizes Italian homework fields without inventing a priority', () => {
    const result = normalizeLifeOsPage(page({ Titolo: title('Esercizi 42-48'), Tipo: select('Compiti'), Materia: select('Matematica'), Scadenza: date('2026-09-15'), Stato: status('Da fare') }), new Map(), 'school')
    expect(result.item).toMatchObject({ title: 'Esercizi 42-48', type: 'homework', subject: 'Matematica', due: '2026-09-15', status: 'open', priority: null })
  })

  it('creates a schedule entry only from a real weekday and subject', () => {
    const result = normalizeLifeOsPage(page({ Nome: title('Prima ora'), Giorno: select('Lunedì'), Materia: select('Fisica') }), new Map(), 'school')
    expect(result.scheduleEntry).toMatchObject({ weekday: 1, subject: 'Fisica' })
    expect(result.item).toBeNull()
  })

  it('resolves a subject relation by its accessible related page title', () => {
    const result = normalizeLifeOsPage(page({ Nome: title('Interrogazione'), Tipo: select('Interrogazione'), Materia: relation('subject-1'), Data: date('2026-09-18') }), new Map([['subject-1', 'Storia']]), 'school')
    expect(result.item).toMatchObject({ type: 'oral-assessment', subject: 'Storia' })
    expect(result.item?.issues).toEqual([])
  })

  it('flags an assessment whose subject relation is inaccessible', () => {
    const result = normalizeLifeOsPage(page({ Nome: title('Verifica'), Tipo: select('Verifica scritta'), Materia: relation('missing-id'), Data: date('2026-09-18') }), new Map(), 'school')
    expect(result.item?.issues.map(issue => issue.code)).toContain('missing-subject')
    expect(result.item?.issues.map(issue => issue.code)).toContain('inaccessible-relation')
  })

  it('keeps an unrecognized dated school record and reports missing metadata', () => {
    const result = normalizeLifeOsPage(page({ Nome: title('Portare autorizzazione'), Data: date('2026-09-16') }), new Map(), 'school')
    expect(result.item).toMatchObject({ type: 'other', status: 'unknown' })
    expect(result.item?.issues.map(issue => issue.code)).toContain('missing-type')
  })
})
