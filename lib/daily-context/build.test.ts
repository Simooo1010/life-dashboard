import { describe, expect, it } from 'vitest'
import type { CalendarData } from '../calendar/google'
import type { LifeOsOverview, OperationalItem } from '../life-os/types'
import { buildDailyContext } from './build'

function calendar(title = 'Physics test'): CalendarData {
  return {
    todayEvents: [{
      id: 'event-1', title, start: '2026-09-13T10:00:00', end: '2026-09-13T11:00:00',
      isAllDay: false, category: 'school', calendarId: 'primary',
    }],
    upcomingEvents: [{
      id: 'event-2', title: 'Volleyball training', start: '2026-09-14T18:00:00', end: '2026-09-14T20:00:00',
      isAllDay: false, category: 'sport', calendarId: 'primary',
    }],
    fetchedAt: '2026-09-13T08:00:00.000Z',
  }
}

function operationalItem(overrides: Partial<OperationalItem> = {}): OperationalItem {
  return {
    id: 'homework-1', title: 'Complete physics problems', type: 'homework', date: '2026-09-14',
    start: null, end: null, isAllDay: true, domain: 'School', subject: 'Physics', status: 'open',
    priority: 'High', source: 'notion', sourceId: 'notion-homework-1', sourceUrl: 'https://notion.so/homework-1',
    issues: [], ...overrides,
  }
}

function lifeOs(item = operationalItem()): LifeOsOverview {
  return {
    today: [], tomorrow: [item],
    nextSevenDays: [{ date: '2026-09-14', items: [item], workloadScore: 1, workloadCount: 1 }],
    school: { openHomeworkCount: 1, upcomingAssessmentCount: 0, nearestAssessments: [], subjectsInvolved: ['Physics'], workload: [], busiestDates: [] },
    otherAreas: [], anomalies: [], sources: [], pageUrl: 'https://notion.so/life-os', generatedAt: '2026-09-13T08:00:00.000Z',
  }
}

describe('buildDailyContext', () => {
  it('builds evidence-addressable facts from Calendar, Life OS, and current Newsletter state', () => {
    const result = buildDailyContext({
      now: new Date('2026-09-13T08:00:00.000Z'),
      timeZone: 'Europe/Rome',
      calendar: calendar(),
      lifeOs: lifeOs(),
      newsletter: {
        pageUrl: 'https://notion.so/newsletter',
        fetchedAt: '2026-09-13T08:00:00.000Z',
        currentFocus: 'Validate the onboarding quiz',
        nextMilestone: 'Publish pilot on 2026-09-16',
        blockers: [],
        milestones: [{ id: 'milestone-1', title: 'Publish pilot', date: '2026-09-16' }],
      },
    })

    expect(result.localDate).toBe('2026-09-13')
    expect(result.facts.map(fact => fact.id)).toEqual([
      'calendar:event-1',
      'calendar:event-2',
      'life-os:homework-1',
      'newsletter:current-focus',
      'newsletter:milestone-1',
    ])
    expect(result.facts.find(fact => fact.id === 'life-os:homework-1')).toMatchObject({
      urgency: 'soon', sourceUrl: 'https://notion.so/homework-1', tokens: expect.arrayContaining(['physics']),
    })
    expect(result.workload).toEqual({ todayCount: 1, nextThreeDaysCount: 4, assessmentCount: 1, concentration: 'high' })
  })

  it('changes the context hash when meaningful Life OS work changes', () => {
    const base = { now: new Date('2026-09-13T08:00:00.000Z'), timeZone: 'Europe/Rome', calendar: calendar() }
    const first = buildDailyContext({ ...base, lifeOs: lifeOs(), newsletter: null })
    const changed = buildDailyContext({
      ...base,
      lifeOs: lifeOs(operationalItem({ title: 'Prepare oral history assessment', type: 'oral-assessment', subject: 'History' })),
      newsletter: null,
    })

    expect(first.contextHash).not.toBe(changed.contextHash)
  })

  it('omits unavailable or irrelevant optional-source signals instead of inventing context', () => {
    const result = buildDailyContext({
      now: new Date('2026-09-13T08:00:00.000Z'),
      timeZone: 'Europe/Rome',
      calendar: { todayEvents: [], upcomingEvents: [], fetchedAt: '2026-09-13T08:00:00.000Z' },
      lifeOs: null,
      newsletter: { pageUrl: 'https://notion.so/newsletter', fetchedAt: '2026-09-13T08:00:00.000Z', blockers: [], milestones: [] },
    })

    expect(result.facts).toEqual([])
    expect(result.workload.concentration).toBe('low')
  })
})
