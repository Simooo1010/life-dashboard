import { NextRequest, NextResponse } from 'next/server'
import { fetchSecondBrainData } from '@/lib/notion/second-brain'
import { fetchCalendarData } from '@/lib/calendar/google'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { fetchWeatherData } from '@/lib/weather/client'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Source = 'calendar' | 'second-brain' | 'life-os' | 'weather' | 'newsletter'

const FETCHERS: Record<Source, () => Promise<unknown>> = {
  'calendar': fetchCalendarData,
  'second-brain': fetchSecondBrainData,
  'life-os': fetchLifeOsData,
  'weather': fetchWeatherData,
  'newsletter': () => fetchNewsletterProjectState({ forceRefresh: true }),
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = (await params) as { source: Source }
  const fetcher = FETCHERS[source]

  if (!fetcher) {
    return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 })
  }

  try {
    const data = await fetcher()
    return NextResponse.json({ data, source, fetchedAt: new Date().toISOString() })
  } catch (error) {
    console.error(`[api/sync/${source}]`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
