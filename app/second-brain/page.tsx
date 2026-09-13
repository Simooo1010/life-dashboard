import { AppShell } from '@/components/layout/AppShell'
import { RelevantToday } from '@/components/second-brain/RelevantToday'
import { Rediscover } from '@/components/second-brain/Rediscover'
import { loadDailyContext } from '@/lib/daily-context/service'
import { getContextualSecondBrain } from '@/lib/second-brain/service'
import { Brain } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SecondBrainPage() {
  const context = await loadDailyContext()
  const result = await getContextualSecondBrain(context.context)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">Secondo Cervello</h1>
          <Brain size={18} className="text-ink-muted" />
        </div>
        <RelevantToday recommendations={result.relevantToday} />
        <Rediscover recommendations={result.rediscover} />
        <p className="text-2xs text-ink-faint">Contesto aggiornato {new Date(result.generatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </AppShell>
  )
}
