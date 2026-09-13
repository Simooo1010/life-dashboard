import { fetchSecondBrainData } from '@/lib/notion/second-brain'
import { fetchCalendarData } from '@/lib/calendar/google'
import { fetchWeatherData } from '@/lib/weather/client'
import { correlateCalendarWithWeather, type WeatherContextSignals } from '@/lib/weather/correlation'
import type { NormalizedWeatherData } from '@/lib/weather/types'
import { dashboardSupabase } from '@/lib/supabase/dashboard-client'
import { generateDailySynthesis, computeInputHash, type AllSourceData, type DailySynthesis } from '@/lib/groq/synthesis'
import { db, runMigrations } from '@/db'
import { dailySyntheses } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export interface OrchestratorResult {
  synthesis: DailySynthesis
  sourceData: AllSourceData
  weather: NormalizedWeatherData | null
  weatherSignals: WeatherContextSignals | null
  fromCache: boolean
  cacheAge?: number
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

const isCloudMode = process.env.PERSISTENCE_MODE === 'supabase' || Boolean(process.env.VERCEL)
let migrationsRun = false

async function ensureMigrations() {
  if (!isCloudMode && !migrationsRun) {
    await runMigrations()
    migrationsRun = true
  }
}

export async function runDailyOrchestrator(forceRefresh = false): Promise<OrchestratorResult> {
  await ensureMigrations()

  const date = getTodayStr()

  // Fetch all sources in parallel (Calendar, Second Brain, Weather)
  const [calendar, secondBrain, weatherResult] = await Promise.allSettled([
    fetchCalendarData(),
    fetchSecondBrainData(),
    fetchWeatherData(),
  ])

  const calendarData = calendar.status === 'fulfilled' ? calendar.value : emptyCalendarData()
  const secondBrainData = secondBrain.status === 'fulfilled' ? secondBrain.value : emptySecondBrainData()
  const weatherData = weatherResult.status === 'fulfilled' ? weatherResult.value : null

  // Correlate calendar with weather
  const weatherSignals = weatherData ? correlateCalendarWithWeather(calendarData.todayEvents, weatherData) : null

  const sourceData: AllSourceData = {
    date,
    calendar: calendarData,
    secondBrain: secondBrainData,
    weather: weatherSignals ?? undefined,
  }

  const newHash = computeInputHash(sourceData)

  // ─── Cache check ──────────────────────────────────────────────────────────
  if (!forceRefresh) {
    if (isCloudMode && dashboardSupabase) {
      try {
        const { data: rows, error } = await dashboardSupabase
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
    } else {
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
  const synthesis = await generateDailySynthesis(sourceData)

  // ─── Cache persist ────────────────────────────────────────────────────────
  if (isCloudMode && dashboardSupabase) {
    try {
      await dashboardSupabase
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
    } catch (err) {
      console.warn('[Orchestrator] Supabase cache write warning:', err)
    }
  } else {
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
