import { AppShell } from '@/components/layout/AppShell'
import { NewsletterDashboard } from '@/components/newsletter/NewsletterDashboard'
import { fetchCalendarData } from '@/lib/calendar/google'
import { findProjectCalendarEvents } from '@/lib/newsletter/calendar'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import { NOTION_PAGES } from '@/lib/notion/client'
import { ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewsletterPage() {
  const [stateResult, calendarResult] = await Promise.allSettled([
    fetchNewsletterProjectState(),
    fetchCalendarData(),
  ])

  if (stateResult.status === 'rejected') {
    console.error('[NewsletterPage]', stateResult.reason)
    const notionUrl = `https://app.notion.com/p/${NOTION_PAGES.newsletterBrief.replace(/-/g, '')}`
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 md:px-8">
          <p className="section-label">Newsletter</p>
          <div className="card space-y-3">
            <h1 className="text-xl font-semibold text-ink">Fonte momentaneamente non disponibile</h1>
            <p className="text-sm leading-relaxed text-ink-muted">La dashboard non può leggere il Master Brief in questo momento. Nessuno stato sostitutivo è stato generato.</p>
            <a href={notionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">Apri la fonte in Notion <ExternalLink size={13} /></a>
          </div>
        </div>
      </AppShell>
    )
  }

  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value : { todayEvents: [], upcomingEvents: [], fetchedAt: new Date().toISOString() }
  return <AppShell><NewsletterDashboard state={stateResult.value} events={findProjectCalendarEvents(stateResult.value, calendar)} /></AppShell>
}
