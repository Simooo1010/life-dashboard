import type { EventCategory } from '@/lib/calendar/google'

export type LifeOsItemType =
  | 'homework'
  | 'written-assessment'
  | 'oral-assessment'
  | 'school-event'
  | 'obligation'
  | 'other'

export type LifeOsItemStatus = 'open' | 'done' | 'unknown'

export type LifeOsIssueCode =
  | 'overdue'
  | 'missing-subject'
  | 'missing-status'
  | 'missing-type'
  | 'inaccessible-relation'
  | 'source-unavailable'
  | 'conflicting-time'
  | 'overlapping-events'

export interface LifeOsIssue {
  id: string
  code: LifeOsIssueCode
  message: string
  severity: 'info' | 'warning'
  itemId?: string
  sourceUrl?: string
}

export interface LifeOsItem {
  id: string
  title: string
  type: LifeOsItemType
  domain: string | null
  subject: string | null
  start: string | null
  due: string | null
  end: string | null
  status: LifeOsItemStatus
  priority: string | null
  grade: number | null
  sourceUrl: string
  sourceDatabaseId: string
  lastEditedAt: string
  issues: LifeOsIssue[]
}

export interface SchoolScheduleEntry {
  id: string
  weekday: number
  subject: string
  startTime: string | null
  endTime: string | null
  sourceUrl: string
}

export interface LifeOsSourceStatus {
  source: 'notion' | 'calendar'
  sourceId?: string
  label: string
  state: 'available' | 'empty' | 'partial' | 'unavailable'
  checkedAt: string
  message?: string
}

export interface LifeOsSnapshot {
  pageUrl: string
  title: string
  items: LifeOsItem[]
  schedule: SchoolScheduleEntry[]
  sources: LifeOsSourceStatus[]
  fetchedAt: string
}

export interface OperationalItem {
  id: string
  title: string
  type: LifeOsItemType | 'calendar-event' | 'schedule'
  date: string
  start: string | null
  end: string | null
  isAllDay: boolean
  domain: string | null
  subject: string | null
  status: LifeOsItemStatus
  priority: string | null
  source: 'notion' | 'calendar'
  sourceId: string
  sourceUrl?: string
  calendarCategory?: EventCategory
  issues: LifeOsIssue[]
  linkedSourceIds?: string[]
}

export interface OperationalDay {
  date: string
  items: OperationalItem[]
  workloadScore: number
  workloadCount: number
}

export interface SchoolWorkloadDay {
  date: string
  score: number
  count: number
}

export interface SchoolOverview {
  openHomeworkCount: number
  upcomingAssessmentCount: number
  nearestAssessments: OperationalItem[]
  subjectsInvolved: string[]
  workload: SchoolWorkloadDay[]
  busiestDates: string[]
}

export interface LifeAreaOverview {
  name: string
  items: OperationalItem[]
}

export interface LifeOsOverview {
  today: OperationalItem[]
  tomorrow: OperationalItem[]
  nextSevenDays: OperationalDay[]
  school: SchoolOverview
  otherAreas: LifeAreaOverview[]
  anomalies: LifeOsIssue[]
  sources: LifeOsSourceStatus[]
  pageUrl: string
  generatedAt: string
}

export interface LifeOsPulseFact {
  id: string
  label: string
  detail: string
  tone: 'neutral' | 'school' | 'attention'
  sourceUrl?: string
}
