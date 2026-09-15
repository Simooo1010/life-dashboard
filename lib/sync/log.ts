import { dashboardSupabase } from '@/lib/supabase/dashboard-client'
import { db, runMigrations } from '@/db'
import { syncLog } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { selectDailyPersistenceBackend } from '@/lib/orchestrator/persistence'

export type SyncSource = 'calendar' | 'life-os' | 'second-brain' | 'newsletter' | 'weather' | 'finance' | 'synthesis'
export type SyncTrigger = 'manual' | 'auto'
export type SyncStatus = 'success' | 'error'

export interface SyncLogEntry {
  id: number | string
  source: SyncSource
  trigger: SyncTrigger
  status: SyncStatus
  startedAt: string
  finishedAt: string
  durationMs: number
  detail: string | null
  errorMessage: string | null
}

const isCloudMode = process.env.PERSISTENCE_MODE === 'supabase' || Boolean(process.env.VERCEL)
const backend = selectDailyPersistenceBackend(isCloudMode, Boolean(dashboardSupabase))
let migrationsEnsured = false

async function ensureMigrations() {
  if (backend === 'sqlite' && !migrationsEnsured) {
    await runMigrations()
    migrationsEnsured = true
  }
}

async function persistRun(entry: Omit<SyncLogEntry, 'id'>): Promise<void> {
  try {
    await ensureMigrations()
    if (backend === 'supabase') {
      await dashboardSupabase!.from('sync_log').insert({
        source: entry.source,
        trigger: entry.trigger,
        status: entry.status,
        started_at: entry.startedAt,
        finished_at: entry.finishedAt,
        duration_ms: entry.durationMs,
        detail: entry.detail,
        error_message: entry.errorMessage,
      })
    } else if (backend === 'sqlite') {
      await db.insert(syncLog).values({
        source: entry.source,
        trigger: entry.trigger,
        status: entry.status,
        startedAt: entry.startedAt,
        finishedAt: entry.finishedAt,
        durationMs: entry.durationMs,
        detail: entry.detail,
        errorMessage: entry.errorMessage,
      })
    }
  } catch (err) {
    // Missing table, unavailable backend, etc. Never let logging break a sync.
    console.warn(`[SyncLog] failed to persist run for "${entry.source}":`, err)
  }
}

/**
 * Runs `fn`, timing it and recording a sync_log row regardless of outcome.
 * Re-throws on failure so callers keep their existing error handling.
 */
export async function recordSyncRun<T>(
  source: SyncSource,
  trigger: SyncTrigger,
  fn: () => Promise<T>,
  describe?: (result: T) => string,
): Promise<T> {
  const startedAt = new Date().toISOString()
  const start = Date.now()
  try {
    const result = await fn()
    await persistRun({
      source,
      trigger,
      status: 'success',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      detail: describe ? describe(result) : null,
      errorMessage: null,
    })
    return result
  } catch (error) {
    await persistRun({
      source,
      trigger,
      status: 'error',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      detail: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function getRecentSyncLogs(limit = 30): Promise<SyncLogEntry[]> {
  try {
    await ensureMigrations()
    if (backend === 'supabase') {
      const { data, error } = await dashboardSupabase!
        .from('sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error || !data) return []
      return data.map(row => ({
        id: row.id,
        source: row.source,
        trigger: row.trigger,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        durationMs: row.duration_ms,
        detail: row.detail,
        errorMessage: row.error_message,
      }))
    }
    if (backend === 'sqlite') {
      const rows = await db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(limit)
      return rows.map(row => ({
        id: row.id,
        source: row.source as SyncSource,
        trigger: row.trigger as SyncTrigger,
        status: row.status as SyncStatus,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
        durationMs: row.durationMs,
        detail: row.detail,
        errorMessage: row.errorMessage,
      }))
    }
  } catch (err) {
    console.warn('[SyncLog] failed to load history:', err)
  }
  return []
}

export async function getLastSuccessMap(): Promise<Partial<Record<SyncSource, string>>> {
  const logs = await getRecentSyncLogs(200)
  const map: Partial<Record<SyncSource, string>> = {}
  for (const entry of logs) {
    if (entry.status === 'success' && !map[entry.source]) {
      map[entry.source] = entry.finishedAt
    }
  }
  return map
}
