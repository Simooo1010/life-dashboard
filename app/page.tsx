import { Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { DailyHero } from '@/components/home/DailyHero'
import { WeatherSection } from '@/components/home/WeatherSection'
import { TimelineSection } from '@/components/home/TimelineSection'
import { PrioritiesSection } from '@/components/home/PrioritiesSection'
import { SecondBrainSection } from '@/components/home/SecondBrainSection'
import { FinanceSection } from '@/components/home/FinanceSection'
import { NewsletterPulse } from '@/components/home/NewsletterPulse'
import { LifeOsPulse } from '@/components/home/LifeOsPulse'
import type { OrchestratorResult } from '@/lib/orchestrator/daily-sync'
import { isFinanceConfigured } from '@/lib/finance/client'
import type { FinanceSnapshot } from '@/lib/finance/types'
import type { NewsletterProjectState } from '@/lib/newsletter/types'
import { startHomeLoads } from '@/lib/home/load'
import {
  loadCachedDailyDashboard,
  loadCachedFinanceSnapshot,
  loadCachedLifeOsOverview,
  loadCachedNewsletter,
  loadCachedSecondBrainPage,
} from '@/lib/cache/dashboard-data'
import type { LifeOsOverview } from '@/lib/life-os/types'
import type { SecondBrainResult } from '@/lib/second-brain/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FinanceHomeData {
  configured: boolean
  snapshot: FinanceSnapshot | null
  observations: string[] | null
}

async function loadDailyHomeData(): Promise<OrchestratorResult | null> {
  try {
    return await loadCachedDailyDashboard()
  } catch (error) {
    console.error('[HomePage]', error)
    return null
  }
}

async function loadFinanceHomeData(): Promise<FinanceHomeData> {
  const configured = isFinanceConfigured()
  if (!configured) return { configured: false, snapshot: null, observations: null }

  let snapshot: FinanceSnapshot | null = null
  let observations: string[] | null = null
  try {
    snapshot = await loadCachedFinanceSnapshot()
  } catch (error) {
    console.error('[HomePage][Finance]', error)
  }
  return { configured, snapshot, observations }
}

async function loadNewsletterHomeData(): Promise<NewsletterProjectState | null> {
  try {
    return await loadCachedNewsletter()
  } catch (error) {
    console.error('[HomePage][Newsletter]', error)
    return null
  }
}

async function loadLifeOsHomeData(): Promise<LifeOsOverview | null> {
  try {
    return await loadCachedLifeOsOverview()
  } catch (error) {
    console.error('[HomePage][LifeOS]', error)
    return null
  }
}

async function loadSecondBrainHomeData(): Promise<SecondBrainResult | null> {
  try {
    return (await loadCachedSecondBrainPage()).result
  } catch (error) {
    console.error('[HomePage][SecondBrain]', error)
    return null
  }
}

function HomeSectionFallback({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <section aria-busy="true" aria-label={`${label} in caricamento`} className="space-y-3">
      <p className="section-label">{label}</p>
      <div className={`card overflow-hidden ${tall ? 'h-44' : 'h-28'}`}>
        <div className="h-3 w-1/3 rounded-full bg-border animate-pulse" />
        <div className="mt-4 h-2 w-full rounded-full bg-border/70 animate-pulse" />
        <div className="mt-2 h-2 w-4/5 rounded-full bg-border/70 animate-pulse" />
      </div>
    </section>
  )
}

async function DailyHomeContent({ dataPromise }: { dataPromise: Promise<OrchestratorResult | null> }) {
  const data = await dataPromise
  const synthesis = data?.synthesis
  const sourceData = data?.sourceData

  return (
    <>
      <DailyHero
        greeting={synthesis?.greeting}
        dayOverview={synthesis?.dayOverview}
        energyForecast={synthesis?.energyForecast}
        fromCache={data?.fromCache ?? false}
        cacheAge={data?.cacheAge}
      />

      <WeatherSection
        weather={data?.weather ?? null}
        weatherSignals={data?.weatherSignals ?? null}
        weatherNote={synthesis?.weatherNote}
      />

      {sourceData && <TimelineSection todayEvents={sourceData.calendar.todayEvents} />}
      {synthesis?.priorities && synthesis.priorities.length > 0 && (
        <PrioritiesSection priorities={synthesis.priorities} />
      )}

    </>
  )
}

async function LifeOsHomeContent({ dataPromise }: { dataPromise: Promise<LifeOsOverview | null> }) {
  return <LifeOsPulse overview={await dataPromise ?? undefined} />
}

async function SecondBrainHomeContent({ dataPromise }: { dataPromise: Promise<SecondBrainResult | null> }) {
  const data = await dataPromise
  return <SecondBrainSection recommendations={data?.relevantToday.slice(0, 2) ?? []} />
}

async function FinanceHomeContent({ dataPromise }: { dataPromise: Promise<FinanceHomeData> }) {
  const finance = await dataPromise
  return (
    <FinanceSection
      snapshot={finance.snapshot}
      observations={finance.observations}
      configured={finance.configured}
    />
  )
}

async function NewsletterHomeContent({ dataPromise }: { dataPromise: Promise<NewsletterProjectState | null> }) {
  return <NewsletterPulse state={await dataPromise} />
}

async function HomeUpdatedAt({ dataPromise }: { dataPromise: Promise<OrchestratorResult | null> }) {
  const data = await dataPromise
  if (!data?.synthesis.generatedAt) return null
  return (
    <footer className="text-center text-2xs text-ink-faint pb-2">
      Aggiornato {new Date(data.synthesis.generatedAt).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      })}
      {data.fromCache && ' · da cache'}
    </footer>
  )
}

export default function HomePage() {
  const loads = startHomeLoads({
    daily: loadDailyHomeData,
    finance: loadFinanceHomeData,
    newsletter: loadNewsletterHomeData,
  })
  const lifeOsPromise = loadLifeOsHomeData()
  const secondBrainPromise = lifeOsPromise.then(() => loadSecondBrainHomeData())

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-10">
        <Suspense fallback={<HomeSectionFallback label="La tua giornata" tall />}>
          <DailyHomeContent dataPromise={loads.daily} />
        </Suspense>

        <Suspense fallback={<HomeSectionFallback label="Life OS" />}>
          <LifeOsHomeContent dataPromise={lifeOsPromise} />
        </Suspense>

        <Suspense fallback={<HomeSectionFallback label="Secondo Cervello" />}>
          <SecondBrainHomeContent dataPromise={secondBrainPromise} />
        </Suspense>

        <Suspense fallback={<HomeSectionFallback label="Finanze" />}>
          <FinanceHomeContent dataPromise={loads.finance} />
        </Suspense>

        <Suspense fallback={<HomeSectionFallback label="Newsletter" />}>
          <NewsletterHomeContent dataPromise={loads.newsletter} />
        </Suspense>

        <Suspense fallback={null}>
          <HomeUpdatedAt dataPromise={loads.daily} />
        </Suspense>
      </div>
    </AppShell>
  )
}
