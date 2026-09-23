import { describe, expect, it } from 'vitest'
import { buildFastDailySynthesis, computeInputHash, type AllSourceData } from './synthesis'

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

describe('computeInputHash', () => {
  it('is unaffected by lifeOs/secondBrain fields that are only populated on forceRefresh', () => {
    // Regression test: the orchestrator only fetches Life OS / Second Brain
    // live on forceRefresh — every normal auto run sees them as empty
    // placeholders. The hash must not depend on those fields, or every auto
    // run right after a manual sync would look like "new input" and
    // overwrite the good synthesis with a degraded one, freezing the
    // displayed sync time on that placeholder hash.
    const autoRun = sourceData()
    const forceRun: AllSourceData = {
      ...autoRun,
      secondBrain: {
        recentConcepts: [{ concept: 'Termodinamica', lastEditedAt: '2026-09-14T06:00:00.000Z' }],
        unprocessedSources: [{ id: 'src-1', status: 'unprocessed' }],
        fetchedAt: '2026-09-14T07:00:00.000Z',
      },
      dailyContext: { ...autoRun.dailyContext!, contextHash: 'different-context-hash' },
      contextualSecondBrain: {
        relevantToday: [{ id: 'rec-1' }],
        rediscover: [],
        generatedAt: '2026-09-14T07:00:00.000Z',
        contextHash: 'different-context-hash',
        knowledgeRevisionHash: 'rev-1',
        sourceStatuses: [],
        fromCache: false,
      },
      lifeOs: {
        today: [{ title: 'Compito', date: '2026-09-14', status: 'pending' }],
        tomorrow: [],
        nextSevenDays: [],
        anomalies: [],
      },
    } as unknown as AllSourceData

    expect(computeInputHash(forceRun)).toBe(computeInputHash(autoRun))
  })

  it('still changes when calendar or weather actually change', () => {
    const base = sourceData()
    const changed: AllSourceData = {
      ...base,
      weather: { summaryForAI: 'pioggia forte' } as AllSourceData['weather'],
    }

    expect(computeInputHash(changed)).not.toBe(computeInputHash(base))
  })
})
