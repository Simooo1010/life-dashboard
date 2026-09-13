import { AppShell } from '@/components/layout/AppShell'
import { DailyHero } from '@/components/home/DailyHero'
import { WeatherSection } from '@/components/home/WeatherSection'
import { TimelineSection } from '@/components/home/TimelineSection'
import { PrioritiesSection } from '@/components/home/PrioritiesSection'
import { SecondBrainSection } from '@/components/home/SecondBrainSection'
import { FinanceSection } from '@/components/home/FinanceSection'
import { runDailyOrchestrator } from '@/lib/orchestrator/daily-sync'
import { isFinanceConfigured } from '@/lib/finance/client'
import { fetchFinanceSnapshot } from '@/lib/finance/snapshot'
import { getFinanceInsights } from '@/lib/groq/finance-insights'
import type { FinanceSnapshot } from '@/lib/finance/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function loadFinanceHomeData() {
  const configured = isFinanceConfigured()
  if (!configured) return { configured: false, snapshot: null, observations: null }

  let snapshot: FinanceSnapshot | null = null
  let observations: string[] | null = null
  try {
    snapshot = await fetchFinanceSnapshot()
    const insights = await getFinanceInsights(snapshot, 'compact')
    observations = insights?.observations ?? null
  } catch (error) {
    console.error('[HomePage][Finance]', error)
  }
  return { configured, snapshot, observations }
}

export default async function HomePage() {
  let data
  try {
    data = await runDailyOrchestrator()
  } catch (error) {
    console.error('[HomePage]', error)
    data = null
  }

  const finance = await loadFinanceHomeData()

  const synthesis = data?.synthesis
  const sourceData = data?.sourceData
  const weather = data?.weather ?? null
  const weatherSignals = data?.weatherSignals ?? null
  const fromCache = data?.fromCache ?? false

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-10">

        {/* ─── Hero ───────────────────────────────────────────────── */}
        <DailyHero
          greeting={synthesis?.greeting}
          dayOverview={synthesis?.dayOverview}
          energyForecast={synthesis?.energyForecast}
          fromCache={fromCache}
          cacheAge={data?.cacheAge}
        />

        {/* ─── Weather snapshot ─────────────────────────────────── */}
        <WeatherSection
          weather={weather}
          weatherSignals={weatherSignals}
          weatherNote={synthesis?.weatherNote}
        />

        {/* ─── Today's timeline ─────────────────────────────────── */}
        {sourceData && (
          <TimelineSection
            todayEvents={sourceData.calendar.todayEvents}
          />
        )}

        {/* ─── AI Priorities ────────────────────────────────────── */}
        {synthesis?.priorities && synthesis.priorities.length > 0 && (
          <PrioritiesSection priorities={synthesis.priorities} />
        )}

        {/* ─── Second Brain pulse ───────────────────────────────── */}
        {sourceData && (
          <SecondBrainSection
            recentConcepts={sourceData.secondBrain.recentConcepts}
            unprocessedCount={sourceData.secondBrain.unprocessedSources.length}
            insight={synthesis?.secondBrainInsight}
          />
        )}

        {/* ─── Finance pulse ────────────────────────────────────── */}
        <FinanceSection
          snapshot={finance.snapshot}
          observations={finance.observations}
          configured={finance.configured}
        />

        {/* ─── Newsletter note ──────────────────────────────────── */}
        {synthesis?.newsletterNote && (
          <section>
            <p className="section-label mb-3">Newsletter</p>
            <div className="card">
              <p className="text-sm text-ink leading-relaxed">{synthesis.newsletterNote}</p>
            </div>
          </section>
        )}

        {/* ─── Footer ───────────────────────────────────────────── */}
        <footer className="text-center text-2xs text-ink-faint pb-2">
          {synthesis?.generatedAt && (
            <span>
              Aggiornato {new Date(synthesis.generatedAt).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {fromCache && ' · da cache'}
            </span>
          )}
        </footer>

      </div>
    </AppShell>
  )
}
