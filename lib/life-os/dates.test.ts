import { describe, expect, it } from 'vitest'
import { addLocalDays, getOperationalDateWindow, toLocalDateKey } from './dates'

describe('Life OS date boundaries', () => {
  it('keeps date-only values unchanged', () => {
    expect(toLocalDateKey('2026-09-13', 'Europe/Rome')).toBe('2026-09-13')
  })

  it('uses Rome local time across a UTC midnight', () => {
    expect(toLocalDateKey('2026-09-12T22:30:00.000Z', 'Europe/Rome')).toBe('2026-09-13')
  })

  it('defines tomorrow through day seven as exactly seven future dates', () => {
    expect(getOperationalDateWindow(new Date('2026-09-13T10:00:00+02:00'), 'Europe/Rome')).toEqual({
      today: '2026-09-13',
      tomorrow: '2026-09-14',
      futureEnd: '2026-09-20',
    })
  })

  it('adds days without shifting date-only values through UTC', () => {
    expect(addLocalDays('2026-03-28', 2)).toBe('2026-03-30')
  })
})
