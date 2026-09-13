const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function partsToDateKey(parts: Intl.DateTimeFormatPart[]): string {
  const values = new Map(parts.map(part => [part.type, part.value]))
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}

export function toLocalDateKey(value: string | Date, timeZone: string): string {
  if (typeof value === 'string' && DATE_ONLY.test(value)) return value

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return partsToDateKey(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date))
}

export function addLocalDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const anchor = new Date(Date.UTC(year, month - 1, day + days, 12))
  return anchor.toISOString().slice(0, 10)
}

export function getOperationalDateWindow(now: Date, timeZone: string) {
  const today = toLocalDateKey(now, timeZone)
  return {
    today,
    tomorrow: addLocalDays(today, 1),
    futureEnd: addLocalDays(today, 7),
  }
}
