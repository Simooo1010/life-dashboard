export type DailyContextSource = 'calendar' | 'life-os' | 'newsletter'

export interface DailyContextFact {
  id: string
  source: DailyContextSource
  kind: string
  title: string
  detail: string | null
  occursAt: string | null
  urgency: 'today' | 'soon' | 'overdue' | 'background'
  sourceUrl: string | null
  tokens: string[]
}

export interface DailyContextSourceStatus {
  source: DailyContextSource
  state: 'available' | 'empty' | 'partial' | 'unavailable'
  checkedAt: string
  message?: string
}

export interface DailyContext {
  localDate: string
  timeZone: string
  facts: DailyContextFact[]
  workload: {
    todayCount: number
    nextThreeDaysCount: number
    assessmentCount: number
    concentration: 'low' | 'medium' | 'high'
  }
  sourceStatuses: DailyContextSourceStatus[]
  contextHash: string
}

export interface DailyContextResult {
  context: DailyContext
  rawSources: {
    calendar: unknown
    lifeOs: unknown | null
    newsletter: unknown | null
  }
}
