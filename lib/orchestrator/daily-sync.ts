import { fetchSecondBrainBundle, type SecondBrainData } from '@/lib/notion/second-brain'
import { fetchCalendarData } from '@/lib/calendar/google'
import { fetchWeatherData } from '@/lib/weather/client'
import { correlateCalendarWithWeather, type WeatherContextSignals } from '@/lib/weather/correlation'
import type { NormalizedWeatherData } from '@/lib/weather/types'
import { dashboardSupabase } from '@/lib/supabase/dashboard-client'
import { buildFastDailySynthesis, generateDailySynthesis, computeInputHash, type AllSourceData, type DailySynthesis } from '@/lib/groq/synthesis'
import { db, runMigrations } from '@/db'
import { dailySyntheses } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { buildLifeOsOverview } from '@/lib/life-os/interpret'
import type { LifeOsSnapshot, LifeOsOverview } from '@/lib/life-os/types'
import { loadDailyContext } from '@/lib/daily-context/service'
import { getContextualSecondBrain } from '@/lib/second-brain/service'
import type { SecondBrainResult } from '@/lib/second-brain/types'
import { selectDailyPersistenceBackend } from './persistence'
import { recordSyncRun, type SyncSource, type SyncTrigger } from '@/lib/sync/log'
import { toLocalDateKey } from '@/lib/life-os/dates'

export interface OrchestratorResult {
  synthesis: DailySynthesis
  sourceData: AllSourceData
  weather: NormalizedWeatherData | null
  weatherSignals: WeatherContextSignals | null
  fromCache: boolean
  cacheAge?: number
}

export interface OrchestratorOptions {
  trigger?: SyncTrigger
  onProgress?: (source: SyncSource, status: 'done' | 'error', detail?: string) => void
}

function getTodayStr(): string {
  return toLocalDateKey(new Date(), process.env.LIFE_OS_TIMEZONE ?? 'Europe/Rome')
}

const isCloudMode = process.env.PERSISTENCE_MODE === 'supabase' || Boolean(process.env.VERCEL)
const persistenceBackend = selectDailyPersistenceBackend(isCloudMode, Boolean(dashboardSupabase))
let migrationsRun = false

async function ensureMigrations() {
  if (persistenceBackend === 'sqlite' && !migrationsRun) {
    await runMigrations()
    migrationsRun = true
  }
}

export async function runDailyOrchestrator(
  forceRefresh = false,
  options: OrchestratorOptions = {},
): Promise<OrchestratorResult> {
  await ensureMigrations()

  const date = getTodayStr()
  const trigger: SyncTrigger = options.trigger ?? (forceRefresh ? 'manual' : 'auto')
  const track = <T,>(source: SyncSource, fn: () => Promise<T>): Promise<T> =>
    recordSyncRun(source, trigger, fn)
      .then(result => {
        options.onProgress?.(source, 'done')
        return result
      })
      .catch(error => {
        options.onProgress?.(source, 'error', error instanceof Error ? error.message : String(error))
        throw error
      })

  // Fetch all sources in parallel (Calendar, Life OS, Second Brain, Weather).
  // Life OS/Second Brain are only fetched live here on forceRefresh: Notion
  // shares one rate-limit bucket across Life OS, Second Brain and Newsletter,
  // and each page already keeps its own copy of this data fresh via a
  // dedicated unstable_cache loader (see lib/cache/dashboard-data.ts).
  // Fetching them again here on every normal cache refresh doubled Notion
  // traffic and tripped rate limits in production.
  const lifeOsRequest = forceRefresh ? track('life-os', fetchLifeOsData) : Promise.resolve(emptyLifeOsSnapshot())
  const secondBrainRequest = forceRefresh ? track('second-brain', fetchSecondBrainBundle) : Promise.resolve(null)
  const [calendar, lifeOs, secondBrain, weatherResult] = await Promise.allSettled([
    track('calendar', fetchCalendarData),
    lifeOsRequest,
    secondBrainRequest,
    track('weather', fetchWeatherData),
  ])

  const calendarData = calendar.status === 'fulfilled' ? calendar.value : emptyCalendarData()
  const lifeOsSnapshot: LifeOsSnapshot = lifeOs.status === 'fulfilled' ? lifeOs.value : emptyLifeOsSnapshot()
  const lifeOsOverview: LifeOsOverview = buildLifeOsOverview(lifeOsSnapshot, calendarData, { now: new Date(), timeZone: process.env.LIFE_OS_TIMEZONE ?? 'Europe/Rome' })
  const secondBrainBundle = secondBrain.status === 'fulfilled' ? secondBrain.value : null
  const secondBrainData = secondBrainBundle
    ? summarizeSecondBrain(secondBrainBundle.nodes, secondBrainBundle.rawSources)
    : emptySecondBrainData()
  const weatherData = weatherResult.status === 'fulfilled' ? weatherResult.value : null
  const dailyContext = await loadDailyContext({
    calendar: calendarData,
    lifeOs: lifeOsOverview,
    includeNewsletter: forceRefresh,
  })
  const contextualSecondBrain = forceRefresh
    ? await getContextualSecondBrain(dailyContext.context, {
        forceRefresh: true,
        ...(secondBrainBundle ? { prefetchedNodes: secondBrainBundle.nodes } : {}),
      })
    : emptyContextualSecondBrain(dailyContext.context.contextHash)

  // Correlate calendar with weather
  const weatherSignals = weatherData
    ? await correlateCalendarWithWeather(calendarData.todayEvents, weatherData, { fastMode: !forceRefresh })
    : null

  const sourceData: AllSourceData = {
    date,
    calendar: calendarData,
    secondBrain: secondBrainData,
    weather: weatherSignals ?? undefined,
    lifeOs: lifeOsOverview,
    dailyContext: dailyContext.context,
    contextualSecondBrain,
  }

  const newHash = computeInputHash(sourceData)

  // ─── Cache check ──────────────────────────────────────────────────────────
  if (!forceRefresh) {
    if (persistenceBackend === 'supabase') {
      try {
        const { data: rows, error } = await dashboardSupabase!
          .from('life_dashboard_syntheses')
          .select('*')
          .eq('date', date)
          .order('generated_at', { ascending: false })
          .limit(1)

        if (!error && rows && rows.length > 0 && rows[0].input_hash === newHash) {
          const synthesis = JSON.parse(rows[0].synthesis_json) as DailySynthesis
          const generatedAt = new Date(rows[0].generated_at)
          const cacheAge = Math.round((Date.now() - generatedAt.getTime()) / 60000)
          return { synthesis, sourceData, weather: weatherData, weatherSignals, fromCache: true, cacheAge }
        }
      } catch (err) {
        console.warn('[Orchestrator] Supabase cache lookup warning:', err)
      }
    } else if (persistenceBackend === 'sqlite') {
      const cached = await db
        .select()
        .from(dailySyntheses)
        .where(eq(dailySyntheses.date, date))
        .orderBy(desc(dailySyntheses.generatedAt))
        .limit(1)

      if (cached.length > 0 && cached[0].inputHash === newHash) {
        const synthesis = JSON.parse(cached[0].synthesisJson) as DailySynthesis
        const generatedAt = new Date(cached[0].generatedAt)
        const cacheAge = Math.round((Date.now() - generatedAt.getTime()) / 60000)
        return { synthesis, sourceData, weather: weatherData, weatherSignals, fromCache: true, cacheAge }
      }
    }
  }

  // ─── Generate new synthesis ───────────────────────────────────────────────
  // A failed model call must not throw away the freshly fetched sources:
  // the failure stays in the sync log and the grounded fast synthesis is used.
  const synthesis = forceRefresh
    ? await recordSyncRun('synthesis', trigger, () => generateDailySynthesis(sourceData))
      .then(result => {
        options.onProgress?.('synthesis', 'done')
        return result
      })
      .catch(error => {
        options.onProgress?.('synthesis', 'error', error instanceof Error ? error.message : String(error))
        return buildFastDailySynthesis(sourceData)
      })
    : buildFastDailySynthesis(sourceData)

  // ─── Cache persist ────────────────────────────────────────────────────────
  if (persistenceBackend === 'supabase') {
    try {
      const { error } = await dashboardSupabase!
        .from('life_dashboard_syntheses')
        .upsert(
          {
            date,
            input_hash: newHash,
            synthesis_json: JSON.stringify(synthesis),
            generated_at: new Date().toISOString(),
            source: 'groq',
          },
          { onConflict: 'date' },
        )
      if (error) console.error('[Orchestrator] Supabase cache write failed:', error.message)
    } catch (err) {
      console.warn('[Orchestrator] Supabase cache write warning:', err)
    }
  } else if (persistenceBackend === 'sqlite') {
    await db
      .insert(dailySyntheses)
      .values({
        date,
        inputHash: newHash,
        synthesisJson: JSON.stringify(synthesis),
        source: 'groq',
      })
      .onConflictDoUpdate({
        target: dailySyntheses.date,
        set: {
          inputHash: newHash,
          synthesisJson: JSON.stringify(synthesis),
          generatedAt: new Date().toISOString(),
          source: 'groq',
        },
      })
  }

  return { synthesis, sourceData, weather: weatherData, weatherSignals, fromCache: false }
}

// ─── Empty fallbacks ─────────────────────────────────────────────────────────
function emptyCalendarData() {
  return { todayEvents: [], upcomingEvents: [], fetchedAt: new Date().toISOString() }
}
function emptySecondBrainData() {
  return { recentConcepts: [], unprocessedSources: [], fetchedAt: new Date().toISOString() }
}
function summarizeSecondBrain(
  nodes: Awaited<ReturnType<typeof fetchSecondBrainBundle>>['nodes'],
  rawSources: Awaited<ReturnType<typeof fetchSecondBrainBundle>>['rawSources'],
): SecondBrainData {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
  return {
    recentConcepts: nodes
      .filter(node => new Date(node.lastEditedAt).getTime() >= cutoff)
      .sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt))
      .slice(0, 20),
    unprocessedSources: rawSources.filter(source => source.status?.toLowerCase() === 'unprocessed'),
    fetchedAt: new Date().toISOString(),
  }
}
function emptyLifeOsSnapshot(): LifeOsSnapshot {
  return { title: 'Life OS', items: [], schedule: [], sources: [{ source: 'notion', label: 'Notion · Life OS', state: 'unavailable', checkedAt: new Date().toISOString(), message: 'Source unavailable' }], pageUrl: process.env.NOTION_LIFE_OS_PAGE_URL ?? '', fetchedAt: new Date().toISOString() }
}
function emptyContextualSecondBrain(contextHash: string): SecondBrainResult {
  return {
    relevantToday: [],
    rediscover: [],
    generatedAt: new Date().toISOString(),
    contextHash,
    knowledgeRevisionHash: 'deferred',
    sourceStatuses: [{ source: 'knowledge-graph', state: 'partial', message: 'Caricato separatamente dalla pagina principale' }],
    fromCache: false,
  }
}
