import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LifeOsOverview, OperationalItem } from '@/lib/life-os/types'
import { LifeOsDashboard } from './LifeOsDashboard'

function operationalItem(overrides: Partial<OperationalItem> = {}): OperationalItem {
  return {
    id: 'notion:item',
    title: 'Verifica di fisica',
    type: 'written-assessment',
    date: '2026-09-15',
    start: '2026-09-15',
    end: null,
    isAllDay: true,
    domain: 'Scuola',
    subject: 'Fisica',
    status: 'open',
    priority: null,
    source: 'notion',
    sourceId: 'item',
    sourceUrl: 'https://notion.so/item',
    issues: [],
    ...overrides,
  }
}

function overview(overrides: Partial<LifeOsOverview> = {}): LifeOsOverview {
  const assessment = operationalItem()
  return {
    today: [operationalItem({ id: 'calendar:lesson', title: 'Lezione di storia', type: 'calendar-event', date: '2026-09-13', start: '2026-09-13T09:00:00+02:00', source: 'calendar', sourceId: 'lesson', sourceUrl: undefined })],
    tomorrow: [],
    nextSevenDays: [{ date: '2026-09-14', items: [], workloadScore: 0, workloadCount: 0 }, { date: '2026-09-15', items: [assessment], workloadScore: 2, workloadCount: 1 }],
    school: { openHomeworkCount: 2, upcomingAssessmentCount: 1, nearestAssessments: [assessment], subjectsInvolved: ['Fisica'], workload: [{ date: '2026-09-14', score: 0, count: 0 }, { date: '2026-09-15', score: 2, count: 1 }], busiestDates: [] },
    otherAreas: [],
    anomalies: [],
    sources: [{ source: 'notion', sourceId: 'school-db', label: 'Notion · Scuola', state: 'available', checkedAt: '2026-09-13T08:42:00.000Z' }, { source: 'calendar', label: 'Google Calendar', state: 'available', checkedAt: '2026-09-13T08:42:00.000Z' }],
    pageUrl: 'https://notion.so/life-os',
    generatedAt: '2026-09-13T08:42:00.000Z',
    ...overrides,
  }
}

describe('LifeOsDashboard', () => {
  it('renders the operational hierarchy and source links', () => {
    const html = renderToStaticMarkup(<LifeOsDashboard overview={overview()} />)
    expect(html).toContain('Oggi e adesso')
    expect(html).toContain('Prossimi 7 giorni')
    expect(html).toContain('Verifica scritta')
    expect(html).toContain('Carico scolastico')
    expect(html).toContain('https://notion.so/item')
  })

  it('uses a concise empty state and hides absent life areas', () => {
    const html = renderToStaticMarkup(<LifeOsDashboard overview={overview({
      today: [],
      tomorrow: [],
      nextSevenDays: [],
      school: { openHomeworkCount: 0, upcomingAssessmentCount: 0, nearestAssessments: [], subjectsInvolved: [], workload: [], busiestDates: [] },
      otherAreas: [],
    })} />)
    expect(html).toContain('Nessun lavoro scolastico aperto')
    expect(html).not.toContain('Altre aree')
  })

  it('still renders Calendar operations when Notion is unavailable', () => {
    const html = renderToStaticMarkup(<LifeOsDashboard overview={overview({
      sources: [{ source: 'notion', label: 'Notion · Life OS', state: 'unavailable', checkedAt: '2026-09-13T08:42:00.000Z', message: 'denied' }, { source: 'calendar', label: 'Google Calendar', state: 'available', checkedAt: '2026-09-13T08:42:00.000Z' }],
    })} />)
    expect(html).toContain('Lezione di storia')
    expect(html).toContain('Notion · Life OS')
  })
})
