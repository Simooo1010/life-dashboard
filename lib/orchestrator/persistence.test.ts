import { describe, expect, it } from 'vitest'
import { selectDailyPersistenceBackend } from './persistence'

describe('selectDailyPersistenceBackend', () => {
  it('does not use temporary SQLite when a cloud deployment has no Supabase client', () => {
    expect(selectDailyPersistenceBackend(true, false)).toBe('none')
  })

  it('keeps Supabase for configured cloud deployments and SQLite for local development', () => {
    expect(selectDailyPersistenceBackend(true, true)).toBe('supabase')
    expect(selectDailyPersistenceBackend(false, false)).toBe('sqlite')
  })
})
