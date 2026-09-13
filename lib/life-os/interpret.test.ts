import { describe, expect, it } from 'vitest'
import type { CalendarData, CalendarEvent } from '@/lib/calendar/google'
import type { LifeOsItem, LifeOsSnapshot } from './types'
import { buildLifeOsOverview, selectHomeLifeOsPulse } from './interpret'

const now = new Date('2026-09-13T10:00:00+02:00')
function item(overrides: Partial<LifeOsItem> & Pick<LifeOsItem, 'id' | 'title' | 'type'>): LifeOsItem {
  return { domain: 'Scuola', subject: null, start: null, due: null, end: null, status: 'unknown', priority: null, grade: null, sourceUrl: `https://notion.so/${overrides.id}`, sourceDatabaseId: 'school-db', lastEditedAt: '2026-09-13T08:00:00.000Z', issues: [], ...overrides }
}
function event(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'title' | 'start'>): CalendarEvent {
  return { end: overrides.start, isAllDay: false, category: 'school', calendarId: 'primary', ...overrides }
}
function snapshot(items: LifeOsItem[]): LifeOsSnapshot {
  return { pageUrl: 'https://notion.so/life-os', title: 'Life OS Managing', items, schedule: [{ id: 'schedule-1', weekday: 0, subject: 'Italiano', startTime: '08:00', endTime: '09:00', sourceUrl: 'https://notion.so/schedule-1' }], sources: [{ source: 'notion', sourceId: 'school-db', label: 'Notion · Scuola', state: 'available', checkedAt: '2026-09-13T09:00:00.000Z' }], fetchedAt: '2026-09-13T09:00:00.000Z' }
}
function calendar(events: CalendarEvent[]): CalendarData {
  return { todayEvents: events.filter(value => value.start.startsWith('2026-09-13')), upcomingEvents: events.filter(value => !value.start.startsWith('2026-09-13')), fetchedAt: '2026-09-13T09:00:00.000Z' }
}

describe('buildLifeOsOverview', () => {
  it('derives current school state and seven future days', () => {
    const overview = buildLifeOsOverview(snapshot([
      item({ id: 'today', title: 'Tema', type: 'homework', subject: 'Italiano', due: '2026-09-13', status: 'open' }),
      item({ id: 'tomorrow', title: 'Esercizi', type: 'homework', subject: 'Matematica', due: '2026-09-14', status: 'open' }),
      item({ id: 'old', title: 'Versione', type: 'homework', subject: 'Latino', due: '2026-09-12', status: 'open' }),
      item({ id: 'test', title: 'Verifica di fisica', type: 'written-assessment', subject: 'Fisica', start: '2026-09-16' }),
    ]), calendar([]), { now, timeZone: 'Europe/Rome' })
    expect(overview.today.map(value => value.title)).toEqual(expect.arrayContaining(['Versione', 'Italiano', 'Tema']))
    expect(overview.tomorrow.map(value => value.title)).toContain('Esercizi')
    expect(overview.school).toMatchObject({ openHomeworkCount: 3, upcomingAssessmentCount: 1 })
    expect(overview.school.nearestAssessments[0].title).toBe('Verifica di fisica')
    expect(overview.anomalies.map(value => value.code)).toContain('overdue')
    expect(overview.nextSevenDays).toHaveLength(7)
  })

  it('does not call unknown-status work overdue', () => {
    const overview = buildLifeOsOverview(snapshot([item({ id: 'unknown', title: 'Scheda', type: 'homework', due: '2026-09-10', status: 'unknown' })]), calendar([]), { now, timeZone: 'Europe/Rome' })
    expect(overview.anomalies.map(value => value.code)).not.toContain('overdue')
  })

  it('keeps all assessments tied on the nearest date', () => {
    const overview = buildLifeOsOverview(snapshot([item({ id: 'a', title: 'Fisica', type: 'written-assessment', start: '2026-09-15' }), item({ id: 'bb', title: 'Storia', type: 'oral-assessment', start: '2026-09-15' })]), calendar([]), { now, timeZone: 'Europe/Rome' })
    expect(overview.school.nearestAssessments.map(value => value.title)).toEqual(['Fisica', 'Storia'])
  })

  it('uses Calendar timing for a match and reports a mismatch', () => {
    const overview = buildLifeOsOverview(snapshot([item({ id: 'notion-test', title: 'Verifica di fisica', type: 'written-assessment', start: '2026-09-15T09:00:00+02:00' })]), calendar([event({ id: 'calendar-test', title: 'Verifica di fisica', start: '2026-09-15T11:00:00+02:00', end: '2026-09-15T12:00:00+02:00' })]), { now, timeZone: 'Europe/Rome' })
    const merged = overview.nextSevenDays.flatMap(day => day.items).find(value => value.title === 'Verifica di fisica')
    expect(merged).toMatchObject({ source: 'calendar', start: '2026-09-15T11:00:00+02:00' })
    expect(merged?.linkedSourceIds).toContain('notion-test')
    expect(overview.anomalies.map(value => value.code)).toContain('conflicting-time')
  })

  it('shows only actionable source-backed non-school domains', () => {
    const overview = buildLifeOsOverview(snapshot([item({ id: 'health', title: 'Referto', type: 'obligation', domain: 'Salute', due: '2026-09-17', status: 'open' }), item({ id: 'undated', title: 'Idea vaga', type: 'other', domain: 'Creatività' })]), calendar([]), { now, timeZone: 'Europe/Rome' })
    expect(overview.otherAreas.map(area => area.name)).toEqual(['Salute'])
  })
})

describe('selectHomeLifeOsPulse', () => {
  it('selects no more than four operational facts', () => {
    const overview = buildLifeOsOverview(snapshot([item({ id: 'today', title: 'Tema', type: 'homework', due: '2026-09-13', status: 'open' }), item({ id: 'tomorrow', title: 'Esercizi', type: 'homework', due: '2026-09-14', status: 'open' }), item({ id: 'old', title: 'Versione', type: 'homework', due: '2026-09-12', status: 'open' }), item({ id: 'test', title: 'Verifica', type: 'written-assessment', start: '2026-09-15', subject: 'Fisica' })]), calendar([]), { now, timeZone: 'Europe/Rome' })
    const facts = selectHomeLifeOsPulse(overview)
    expect(facts).toHaveLength(4)
    expect(facts.map(value => value.id)).toEqual(['today-school', 'due-soon', 'nearest-assessment', 'overdue'])
  })
})
