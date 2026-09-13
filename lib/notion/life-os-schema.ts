import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { LifeOsIssue, LifeOsItem, LifeOsItemStatus, LifeOsItemType, SchoolScheduleEntry } from '@/lib/life-os/types'

type NotionProperty = PageObjectResponse['properties'][string]
type DatabaseRole = 'general' | 'school' | 'log'

const ALIASES = {
  type: ['type', 'tipo', 'category', 'categoria'], domain: ['area', 'domain', 'ambito'], subject: ['subject', 'materia', 'discipline'],
  date: ['date', 'data', 'start', 'inizio', 'quando'], due: ['due', 'deadline', 'scadenza', 'consegna'], end: ['end', 'fine'],
  status: ['status', 'stato'], completion: ['done', 'completed', 'completato', 'fatto'], priority: ['priority', 'priorita'],
  weekday: ['day', 'giorno', 'weekday'], grade: ['grade', 'voto'],
} as const

const WEEKDAYS = new Map([['lunedi', 1], ['monday', 1], ['martedi', 2], ['tuesday', 2], ['mercoledi', 3], ['wednesday', 3], ['giovedi', 4], ['thursday', 4], ['venerdi', 5], ['friday', 5], ['sabato', 6], ['saturday', 6], ['domenica', 0], ['sunday', 0]])

export interface NormalizedLifeOsPage { item: LifeOsItem | null; scheduleEntry: SchoolScheduleEntry | null; sourceIssues: LifeOsIssue[] }

export function normalizePropertyName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function propertyByAliases(properties: PageObjectResponse['properties'], aliases: readonly string[]): NotionProperty | undefined {
  const wanted = new Set(aliases.map(normalizePropertyName))
  return Object.entries(properties).find(([name]) => wanted.has(normalizePropertyName(name)))?.[1]
}

function titleValue(properties: PageObjectResponse['properties']): string {
  const property = Object.values(properties).find(candidate => candidate.type === 'title')
  return property?.type === 'title' ? property.title.map(value => value.plain_text).join('').trim() : ''
}

function textValue(property: NotionProperty | undefined): string | null {
  if (!property) return null
  if (property.type === 'select') return property.select?.name?.trim() || null
  if (property.type === 'status') return property.status?.name?.trim() || null
  if (property.type === 'rich_text') return property.rich_text.map(value => value.plain_text).join('').trim() || null
  if (property.type === 'title') return property.title.map(value => value.plain_text).join('').trim() || null
  if (property.type === 'multi_select') return property.multi_select.map(value => value.name).filter(Boolean).join(', ') || null
  return null
}

function dateValue(property: NotionProperty | undefined) {
  if (!property || property.type !== 'date' || !property.date) return { start: null, end: null }
  return { start: property.date.start, end: property.date.end ?? null }
}

function issue(page: PageObjectResponse, code: LifeOsIssue['code'], message: string): LifeOsIssue {
  return { id: `${page.id}:${code}`, code, message, severity: code === 'inaccessible-relation' ? 'info' : 'warning', itemId: page.id, sourceUrl: page.url }
}

function classifyType(rawType: string | null, title: string): LifeOsItemType {
  const value = normalizePropertyName(`${rawType ?? ''} ${title}`)
  if (/interrogaz|oral/.test(value)) return 'oral-assessment'
  if (/verifica|compito in classe|written|test|scritto/.test(value)) return 'written-assessment'
  if (/homework|compiti|esercizi|assignment/.test(value)) return 'homework'
  if (/evento|gita|assemblea|school event/.test(value)) return 'school-event'
  if (/scadenza|deadline|obbligo|obligation/.test(value)) return 'obligation'
  return 'other'
}

function classifyStatus(statusProperty: NotionProperty | undefined, completionProperty: NotionProperty | undefined): LifeOsItemStatus {
  if (completionProperty?.type === 'checkbox') return completionProperty.checkbox ? 'done' : 'open'
  const value = normalizePropertyName(textValue(statusProperty) ?? '')
  if (['done', 'completed', 'complete', 'completato', 'fatto', 'chiuso'].includes(value)) return 'done'
  if (['open', 'to do', 'todo', 'da fare', 'in corso', 'aperto'].includes(value)) return 'open'
  return 'unknown'
}

function subjectValue(property: NotionProperty | undefined, relationTitles: ReadonlyMap<string, string>) {
  const direct = textValue(property)
  if (direct) return { subject: direct, unresolved: false }
  const ids = property?.type === 'relation' ? property.relation.map(value => value.id) : []
  if (ids.length === 0) return { subject: null, unresolved: false }
  const titles = ids.map(id => relationTitles.get(id)).filter((value): value is string => Boolean(value))
  return { subject: titles.length > 0 ? titles.join(', ') : null, unresolved: titles.length !== ids.length }
}

function weekdayValue(property: NotionProperty | undefined): number | null {
  if (property?.type === 'number' && property.number !== null) {
    const value = Math.trunc(property.number)
    return value >= 0 && value <= 6 ? value : null
  }
  return WEEKDAYS.get(normalizePropertyName(textValue(property) ?? '')) ?? null
}

function timeOnly(value: string | null): string | null {
  return value?.match(/T(\d{2}:\d{2})/)?.[1] ?? null
}

export function normalizeLifeOsPage(page: PageObjectResponse, relationTitles: ReadonlyMap<string, string>, role: DatabaseRole = 'general'): NormalizedLifeOsPage {
  const properties = page.properties
  const title = titleValue(properties)
  if (!title) return { item: null, scheduleEntry: null, sourceIssues: [] }
  const subjectResult = subjectValue(propertyByAliases(properties, ALIASES.subject), relationTitles)
  const weekday = weekdayValue(propertyByAliases(properties, ALIASES.weekday))
  const generalDate = dateValue(propertyByAliases(properties, ALIASES.date))
  const explicitDue = dateValue(propertyByAliases(properties, ALIASES.due))
  const explicitEnd = dateValue(propertyByAliases(properties, ALIASES.end))
  if (weekday !== null && subjectResult.subject) {
    return { item: null, scheduleEntry: { id: page.id, weekday, subject: subjectResult.subject, startTime: timeOnly(generalDate.start), endTime: timeOnly(explicitEnd.start ?? generalDate.end), sourceUrl: page.url }, sourceIssues: [] }
  }
  const type = classifyType(textValue(propertyByAliases(properties, ALIASES.type)), title)
  const status = classifyStatus(propertyByAliases(properties, ALIASES.status), propertyByAliases(properties, ALIASES.completion))
  const issues: LifeOsIssue[] = []
  if (subjectResult.unresolved) issues.push(issue(page, 'inaccessible-relation', 'Una relazione collegata non è accessibile.'))
  if ((type === 'written-assessment' || type === 'oral-assessment') && !subjectResult.subject) issues.push(issue(page, 'missing-subject', 'Valutazione senza materia collegata.'))
  if (type === 'other' && (generalDate.start || explicitDue.start) && role === 'school') issues.push(issue(page, 'missing-type', 'Elemento scolastico datato senza un tipo riconoscibile.'))
  if ((type === 'homework' || type === 'obligation') && status === 'unknown') issues.push(issue(page, 'missing-status', 'Attività senza uno stato riconoscibile.'))
  const workDate = explicitDue.start ?? generalDate.start
  return {
    item: {
      id: page.id, title, type, domain: textValue(propertyByAliases(properties, ALIASES.domain)) ?? (role === 'school' ? 'Scuola' : null),
      subject: subjectResult.subject, start: type === 'homework' || type === 'obligation' ? generalDate.start : generalDate.start ?? explicitDue.start,
      due: type === 'homework' || type === 'obligation' ? workDate : explicitDue.start, end: explicitEnd.start ?? generalDate.end ?? explicitDue.end,
      status, priority: textValue(propertyByAliases(properties, ALIASES.priority)),
      grade: propertyByAliases(properties, ALIASES.grade)?.type === 'number' ? (propertyByAliases(properties, ALIASES.grade) as Extract<NotionProperty, { type: 'number' }>).number : null,
      sourceUrl: page.url, sourceDatabaseId: page.parent.type === 'database_id' ? page.parent.database_id : '', lastEditedAt: page.last_edited_time, issues,
    },
    scheduleEntry: null,
    sourceIssues: issues,
  }
}
