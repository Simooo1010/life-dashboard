import { describe, expect, it } from 'vitest'
import { isDashboardSupabaseConfigurationValid } from './dashboard-client'

describe('isDashboardSupabaseConfigurationValid', () => {
  it('rejects documentation placeholders that would trigger production DNS failures', () => {
    expect(isDashboardSupabaseConfigurationValid(
      'https://tuo-progetto.supabase.co',
      'a-real-looking-key',
    )).toBe(false)
    expect(isDashboardSupabaseConfigurationValid(
      'https://your-dashboard-project.supabase.co',
      'your_dashboard_supabase_anon_key',
    )).toBe(false)
  })

  it('accepts a concrete Supabase project URL and key', () => {
    expect(isDashboardSupabaseConfigurationValid(
      'https://abcdefghijklm.supabase.co',
      'eyJhbGciOiJIUzI1NiJ9.project-key',
    )).toBe(true)
  })
})
