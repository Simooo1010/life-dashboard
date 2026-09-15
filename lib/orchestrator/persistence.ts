export type DailyPersistenceBackend = 'supabase' | 'sqlite' | 'none'

export function selectDailyPersistenceBackend(
  isCloudMode: boolean,
  hasSupabaseClient: boolean,
): DailyPersistenceBackend {
  if (isCloudMode) return hasSupabaseClient ? 'supabase' : 'none'
  return 'sqlite'
}
