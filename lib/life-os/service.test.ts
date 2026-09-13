import { describe, expect, it } from 'vitest'
import type { CalendarData } from '@/lib/calendar/google'
import type { LifeOsSnapshot } from './types'
import { fetchLifeOsOverview } from './service'

const now = new Date('2026-09-13T10:00:00+02:00')
const calendarFixture: CalendarData = { todayEvents: [{ id: 'lesson', title: 'Lezione di matematica', start: '2026-09-13T11:00:00+02:00', end: '2026-09-13T12:00:00+02:00', isAllDay: false, category: 'school', calendarId: 'primary' }], upcomingEvents: [], fetchedAt: '2026-09-13T09:00:00.000Z' }
const notionFixture: LifeOsSnapshot = {
  pageUrl: 'https://notion.so/life-os', title: 'Life OS Managing',
  items: [{ id: 'homework', title: 'Esercizi', type: 'homework', domain: 'Scuola', subject: 'Matematica', start: null, due: '2026-09-13', end: null, status: 'open', priority: null, grade: null, sourceUrl: 'https://notion.so/homework', sourceDatabaseId: 'school-db', lastEditedAt: '2026-09-13T08:00:00.000Z', issues: [] }],
  schedule: [], sources: [{ source: 'notion', sourceId: 'school-db', label: 'Notion · Scuola', state: 'available', checkedAt: '2026-09-13T09:00:00.000Z' }], fetchedAt: '2026-09-13T09:00:00.000Z',
}

describe('fetchLifeOsOverview', () => {
  it('keeps Calendar operations visible when Notion is unavailable', async () => {
    const overview = await fetchLifeOsOverview({ fetchNotion: async () => { throw new Error('denied') }, fetchCalendar: async () => calendarFixture, now, timeZone: 'Europe/Rome' })
    expect(overview.today.map(item => item.title)).toContain('Lezione di matematica')
    expect(overview.sources).toContainEqual(expect.objectContaining({ source: 'notion', state: 'unavailable' }))
  })
  it('keeps Notion work visible when Calendar is unavailable', async () => {
    const overview = await fetchLifeOsOverview({ fetchNotion: async () => notionFixture, fetchCalendar: async () => { throw new Error('feed failed') }, now, timeZone: 'Europe/Rome' })
    expect(overview.today.map(item => item.title)).toContain('Esercizi')
    expect(overview.sources).toContainEqual(expect.objectContaining({ source: 'calendar', state: 'unavailable' }))
  })
})
