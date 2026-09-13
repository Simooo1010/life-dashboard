import type { CalendarData, CalendarEvent } from '@/lib/calendar/google'
import { addLocalDays, getOperationalDateWindow, toLocalDateKey } from './dates'
import type { LifeAreaOverview, LifeOsIssue, LifeOsItem, LifeOsOverview, LifeOsPulseFact, LifeOsSnapshot, OperationalDay, OperationalItem, SchoolWorkloadDay } from './types'

export interface BuildLifeOsOverviewOptions { now: Date; timeZone: string }
function normalizedTitle(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase() }
function itemDate(item: LifeOsItem, timeZone: string): string { const value = item.due ?? item.start; return value ? toLocalDateKey(value, timeZone) : '' }
function isSchoolDomain(domain: string | null): boolean { const value = normalizedTitle(domain ?? ''); return value === 'scuola' || value === 'school' }
function notionOperationalItem(item: LifeOsItem, timeZone: string): OperationalItem | null {
  const date = itemDate(item, timeZone)
  if (!date) return null
  return { id: `notion:${item.id}`, title: item.title, type: item.type, date, start: item.start, end: item.end, isAllDay: !(item.start?.includes('T') ?? false), domain: item.domain, subject: item.subject, status: item.status, priority: item.priority, source: 'notion', sourceId: item.id, sourceUrl: item.sourceUrl, issues: [...item.issues] }
}
function calendarOperationalItem(event: CalendarEvent, timeZone: string): OperationalItem {
  return { id: `calendar:${event.id}`, title: event.title, type: 'calendar-event', date: toLocalDateKey(event.start, timeZone), start: event.start, end: event.end, isAllDay: event.isAllDay, domain: event.category === 'school' ? 'Scuola' : event.category, subject: null, status: 'unknown', priority: null, source: 'calendar', sourceId: event.id, calendarCategory: event.category, issues: [] }
}
function timeDifferenceMinutes(first: string | null, second: string | null): number | null {
  if (!first?.includes('T') || !second?.includes('T')) return null
  const values = [new Date(first).getTime(), new Date(second).getTime()]
  return values.some(Number.isNaN) ? null : Math.abs(values[0] - values[1]) / 60000
}
function issue(code: LifeOsIssue['code'], message: string, item?: OperationalItem): LifeOsIssue {
  return { id: `${code}:${item?.sourceId ?? message}`, code, message, severity: code === 'overdue' || code === 'conflicting-time' ? 'warning' : 'info', itemId: item?.sourceId, sourceUrl: item?.sourceUrl }
}
function sortOperationalItems(items: OperationalItem[]): OperationalItem[] {
  return [...items].sort((left, right) => (left.start?.includes('T') ? left.start : `${left.date}T00:00`).localeCompare(right.start?.includes('T') ? right.start : `${right.date}T00:00`) || left.title.localeCompare(right.title, 'it'))
}
function isSchoolItem(item: OperationalItem): boolean {
  return item.type === 'schedule' || item.calendarCategory === 'school' || isSchoolDomain(item.domain) || Boolean(item.subject) || ['homework', 'written-assessment', 'oral-assessment', 'school-event'].includes(item.type)
}
function workloadFor(items: OperationalItem[]) {
  const schoolItems = items.filter(isSchoolItem).filter(item => item.status !== 'done')
  return { count: schoolItems.length, score: schoolItems.reduce((total, item) => total + (item.type === 'written-assessment' || item.type === 'oral-assessment' ? 2 : 1), 0) }
}
function weekdayInTimeZone(now: Date, timeZone: string): number {
  const value = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now)
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[value] ?? 0
}

export function buildLifeOsOverview(snapshot: LifeOsSnapshot, calendar: CalendarData, options: BuildLifeOsOverviewOptions): LifeOsOverview {
  const { today, tomorrow, futureEnd } = getOperationalDateWindow(options.now, options.timeZone)
  const anomalies: LifeOsIssue[] = snapshot.items.flatMap(item => item.issues)
  const notionItems = snapshot.items.map(item => notionOperationalItem(item, options.timeZone)).filter((item): item is OperationalItem => Boolean(item))
  const calendarItems = [...calendar.todayEvents, ...calendar.upcomingEvents].map(event => calendarOperationalItem(event, options.timeZone))
  const unmergedNotion: OperationalItem[] = []
  notionItems.forEach(notionItem => {
    const match = calendarItems.find(calendarItem => calendarItem.date === notionItem.date && normalizedTitle(calendarItem.title) === normalizedTitle(notionItem.title))
    if (!match) { unmergedNotion.push(notionItem); return }
    match.type = notionItem.type; match.subject = notionItem.subject; match.status = notionItem.status; match.priority = notionItem.priority; match.sourceUrl = notionItem.sourceUrl; match.linkedSourceIds = [...(match.linkedSourceIds ?? []), notionItem.sourceId]; match.issues.push(...notionItem.issues)
    const difference = timeDifferenceMinutes(notionItem.start, match.start)
    if (difference !== null && difference > 15) { const conflict = issue('conflicting-time', `Orari diversi tra Notion e Calendar per “${match.title}”.`, match); match.issues.push(conflict); anomalies.push(conflict) }
  })
  const datedItems = [...unmergedNotion, ...calendarItems]
  const overdueItems = unmergedNotion.filter(item => item.status === 'open' && item.date < today)
  overdueItems.forEach(item => { const overdue = issue('overdue', `“${item.title}” risulta ancora aperto oltre la scadenza.`, item); item.issues.push(overdue); anomalies.push(overdue) })
  const todaySchedule: OperationalItem[] = snapshot.schedule.filter(entry => entry.weekday === weekdayInTimeZone(options.now, options.timeZone)).map(entry => ({ id: `schedule:${entry.id}`, title: entry.subject, type: 'schedule', date: today, start: entry.startTime ? `${today}T${entry.startTime}:00` : null, end: entry.endTime ? `${today}T${entry.endTime}:00` : null, isAllDay: !entry.startTime, domain: 'Scuola', subject: entry.subject, status: 'unknown', priority: null, source: 'notion', sourceId: entry.id, sourceUrl: entry.sourceUrl, issues: [] }))

  const events = [...calendar.todayEvents, ...calendar.upcomingEvents].filter(event => !event.isAllDay && event.start && event.end).sort((a, b) => a.start.localeCompare(b.start))
  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index]; const next = events[index + 1]
    if (toLocalDateKey(current.start, options.timeZone) === toLocalDateKey(next.start, options.timeZone) && new Date(next.start).getTime() < new Date(current.end).getTime()) anomalies.push(issue('overlapping-events', `“${current.title}” e “${next.title}” si sovrappongono.`))
  }
  const todayItems = sortOperationalItems([...overdueItems, ...todaySchedule, ...datedItems.filter(item => item.date === today)])
  const tomorrowItems = sortOperationalItems(datedItems.filter(item => item.date === tomorrow))
  const nextSevenDays: OperationalDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(today, index + 1); const items = sortOperationalItems(datedItems.filter(item => item.date === date)); const workload = workloadFor(items)
    return { date, items, workloadScore: workload.score, workloadCount: workload.count }
  })
  const assessmentItems = datedItems.filter(item => (item.type === 'written-assessment' || item.type === 'oral-assessment') && item.date >= today && item.date <= futureEnd)
  const nearestDate = assessmentItems.map(item => item.date).sort()[0]
  const nearestAssessments = nearestDate ? sortOperationalItems(assessmentItems.filter(item => item.date === nearestDate)) : []
  const workload: SchoolWorkloadDay[] = nextSevenDays.map(day => ({ date: day.date, score: day.workloadScore, count: day.workloadCount }))
  const totalCount = workload.reduce((total, day) => total + day.count, 0); const maxScore = Math.max(0, ...workload.map(day => day.score))
  const busiestDates = totalCount >= 2 && maxScore > 0 ? workload.filter(day => day.score === maxScore).map(day => day.date) : []
  const subjectsInvolved = [...new Set(snapshot.items.filter(item => item.status !== 'done').filter(item => { const date = itemDate(item, options.timeZone); return date >= today && date <= futureEnd }).map(item => item.subject).filter((subject): subject is string => Boolean(subject)))]
  const areaMap = new Map<string, OperationalItem[]>()
  unmergedNotion.forEach(item => { if (!item.domain || isSchoolDomain(item.domain) || !item.date || item.status === 'done') return; areaMap.set(item.domain, [...(areaMap.get(item.domain) ?? []), item]) })
  const otherAreas: LifeAreaOverview[] = [...areaMap].sort(([a], [b]) => a.localeCompare(b, 'it')).map(([name, items]) => ({ name, items: sortOperationalItems(items) }))
  const unavailable = 'availability' in calendar && calendar.availability === 'unavailable'
  const calendarStatus = { source: 'calendar' as const, label: 'Google Calendar', state: unavailable ? 'unavailable' as const : 'available' as const, checkedAt: calendar.fetchedAt, ...('error' in calendar && typeof calendar.error === 'string' ? { message: calendar.error } : {}) }
  return { today: todayItems, tomorrow: tomorrowItems, nextSevenDays, school: { openHomeworkCount: snapshot.items.filter(item => item.type === 'homework' && item.status === 'open').length, upcomingAssessmentCount: assessmentItems.length, nearestAssessments, subjectsInvolved, workload, busiestDates }, otherAreas, anomalies: [...new Map(anomalies.map(value => [value.id, value])).values()], sources: [...snapshot.sources, calendarStatus], pageUrl: snapshot.pageUrl, generatedAt: new Date().toISOString() }
}

export function selectHomeLifeOsPulse(overview: LifeOsOverview, limit = 4): LifeOsPulseFact[] {
  const facts: LifeOsPulseFact[] = []
  const schoolToday = overview.today.filter(isSchoolItem)
  const subjects = [...new Set(schoolToday.map(item => item.subject ?? (item.type === 'schedule' ? item.title : null)).filter((value): value is string => Boolean(value)))]
  if (subjects.length) facts.push({ id: 'today-school', label: 'Scuola oggi', detail: subjects.join(', '), tone: 'school', sourceUrl: schoolToday.find(item => item.sourceUrl)?.sourceUrl })
  const dueSoon = [...overview.today, ...overview.tomorrow].filter(item => item.source === 'notion' && item.status === 'open' && (item.type === 'homework' || item.type === 'obligation')).filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index)
  if (dueSoon.length) facts.push({ id: 'due-soon', label: dueSoon.some(item => overview.today.includes(item)) ? 'In scadenza oggi' : 'In scadenza domani', detail: dueSoon.slice(0, 3).map(item => item.title).join(', '), tone: 'attention', sourceUrl: dueSoon[0].sourceUrl })
  const assessment = overview.school.nearestAssessments[0]
  if (assessment) facts.push({ id: 'nearest-assessment', label: 'Prossima valutazione', detail: assessment.subject ? `${assessment.subject}: ${assessment.title}` : assessment.title, tone: 'school', sourceUrl: assessment.sourceUrl })
  const overdue = overview.anomalies.find(value => value.code === 'overdue')
  if (overdue) facts.push({ id: 'overdue', label: 'Da controllare', detail: overdue.message, tone: 'attention', sourceUrl: overdue.sourceUrl })
  if (facts.length < limit) { const dataIssue = overview.anomalies.find(value => value.code !== 'overdue'); if (dataIssue) facts.push({ id: `issue:${dataIssue.id}`, label: 'Dato da completare', detail: dataIssue.message, tone: 'neutral', sourceUrl: dataIssue.sourceUrl }) }
  return facts.slice(0, Math.max(0, limit))
}
