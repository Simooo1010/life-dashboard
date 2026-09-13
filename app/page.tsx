import { AppShell } from '@/components/layout/AppShell'
import { DailyHero } from '@/components/home/DailyHero'
import { WeatherSection } from '@/components/home/WeatherSection'
import { TimelineSection } from '@/components/home/TimelineSection'
import { PrioritiesSection } from '@/components/home/PrioritiesSection'
import { SecondBrainSection } from '@/components/home/SecondBrainSection'
import { FinanceSection } from '@/components/home/FinanceSection'
import { NewsletterPulse } from '@/components/home/NewsletterPulse'
import { LifeOsPulse } from '@/components/home/LifeOsPulse'
import { runDailyOrchestrator } from '@/lib/orchestrator/daily-sync'
import { isFinanceConfigured } from '@/lib/finance/client'
import { fetchFinanceSnapshot } from '@/lib/finance/snapshot'
import { getFinanceInsights } from '@/lib/groq/finance-insights'
import type { FinanceSnapshot } from '@/lib/finance/types'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import type { NewsletterProjectState } from '@/lib/newsletter/types'

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

async function loadNewsletterHomeData(): Promise<NewsletterProjectState | null> {
  try {
    return await fetchNewsletterProjectState()
  } catch (error) {
    console.error('[HomePage][Newsletter]', error)
    return null
  }
}

export default async function HomePage() {
  let data
  try {
    data = await runDailyOrchestrator()
  } catch (error) {
    console.error('[HomePage]', error)
    data = null
  }

  const [finance, newsletter] = await Promise.all([loadFinanceHomeData(), loadNewsletterHomeData()])

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

        <LifeOsPulse overview={sourceData?.lifeOs} />

        {/* ─── AI Priorities ────────────────────────────────────── */}
        {synthesis?.priorities && synthesis.priorities.length > 0 && (
          <PrioritiesSection priorities={synthesis.priorities} />
        )}

        {/* ─── Second Brain pulse ───────────────────────────────── */}
        {sourceData && (
          <SecondBrainSection
            recommendations={sourceData.contextualSecondBrain?.relevantToday.slice(0, 2) ?? []}
          />
        )}

        {/* ─── Finance pulse ────────────────────────────────────── */}
        <FinanceSection
          snapshot={finance.snapshot}
          observations={finance.observations}
          configured={finance.configured}
        />

        {/* ─── Newsletter project pulse ─────────────────────────── */}
        <NewsletterPulse state={newsletter} />

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
