import { AppShell } from '@/components/layout/AppShell'
import { NewsletterDashboard } from '@/components/newsletter/NewsletterDashboard'
import { loadCachedCalendar, loadCachedNewsletter } from '@/lib/cache/dashboard-data'
import { findProjectCalendarEvents } from '@/lib/newsletter/calendar'
import { NOTION_PAGES } from '@/lib/notion/client'
import { ExternalLink } from 'lucide-react'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function NewsletterContent() {
  const [stateResult, calendarResult] = await Promise.allSettled([
    loadCachedNewsletter(),
    loadCachedCalendar(),
  ])

  if (stateResult.status === 'rejected') {
    console.error('[NewsletterPage]', stateResult.reason)
    const notionUrl = `https://app.notion.com/p/${NOTION_PAGES.newsletterBrief.replace(/-/g, '')}`
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 md:px-8">
        <p className="section-label">Newsletter</p>
        <div className="card space-y-3">
          <h1 className="text-xl font-semibold text-ink">Fonte momentaneamente non disponibile</h1>
          <p className="text-sm leading-relaxed text-ink-muted">La dashboard non può leggere il Master Brief in questo momento. Nessuno stato sostitutivo è stato generato.</p>
          <a href={notionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">Apri la fonte in Notion <ExternalLink size={13} /></a>
        </div>
      </div>
    )
  }

  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value : { todayEvents: [], upcomingEvents: [], fetchedAt: new Date().toISOString() }
  return <NewsletterDashboard state={stateResult.value} events={findProjectCalendarEvents(stateResult.value, calendar)} />
}

function NewsletterFallback() {
  return (
    <div aria-busy="true" className="mx-auto max-w-2xl space-y-5 px-4 py-8 md:px-8">
      <h1 className="text-xl font-semibold text-ink">Newsletter</h1>
      <div className="card h-36 animate-pulse" />
      <div className="card h-24 animate-pulse" />
    </div>
  )
}

export default function NewsletterPage() {
  return (
    <AppShell>
      <Suspense fallback={<NewsletterFallback />}>
        <NewsletterContent />
      </Suspense>
    </AppShell>
  )
}
