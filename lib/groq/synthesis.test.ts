import { describe, expect, it } from 'vitest'
import { buildFastDailySynthesis, type AllSourceData } from './synthesis'

function sourceData(): AllSourceData {
  return {
    date: '2026-09-14',
    calendar: {
      todayEvents: [{
        id: 'event-1',
        title: 'Verifica di fisica',
        start: '2026-09-14T10:00:00',
        end: '2026-09-14T11:00:00',
        isAllDay: false,
        category: 'school',
        calendarId: 'primary',
      }],
      upcomingEvents: [],
      fetchedAt: '2026-09-14T07:00:00.000Z',
    },
    secondBrain: { recentConcepts: [], unprocessedSources: [], fetchedAt: '2026-09-14T07:00:00.000Z' },
    dailyContext: {
      localDate: '2026-09-14',
      timeZone: 'Europe/Rome',
      contextHash: 'today',
      facts: [],
      workload: { todayCount: 1, nextThreeDaysCount: 1, assessmentCount: 1, concentration: 'medium' },
      sourceStatuses: [],
    },
  }
}

describe('buildFastDailySynthesis', () => {
  it('builds an immediate grounded overview from source data without a model call', () => {
    const synthesis = buildFastDailySynthesis(sourceData(), new Date('2026-09-14T08:00:00.000Z'))

    expect(synthesis.greeting).toBe('Ciao, Simone.')
    expect(synthesis.dayOverview).toContain('1 impegno')
    expect(synthesis.priorities).toEqual([expect.objectContaining({
      title: 'Verifica di fisica',
      source: 'school',
      urgency: 'high',
    })])
    expect(synthesis.generatedAt).toBe('2026-09-14T08:00:00.000Z')
    expect(synthesis.inputHash).toHaveLength(64)
  })
})
