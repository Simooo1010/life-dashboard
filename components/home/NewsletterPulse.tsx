import Link from 'next/link'
import { ArrowUpRight, Newspaper } from 'lucide-react'
import { getNewsletterPulseSignals } from '@/lib/newsletter/pulse'
import type { NewsletterProjectState } from '@/lib/newsletter/types'

const DOTS = { focus: 'bg-amber-500', change: 'bg-blue-500', blocker: 'bg-rose-500', question: 'bg-violet-500', phase: 'bg-ink-faint' } as const

export function NewsletterPulse({ state }: { state: NewsletterProjectState | null }) {
  if (!state) return null
  const signals = getNewsletterPulseSignals(state)
  if (!signals.length) return null

  return (
    <section aria-labelledby="newsletter-pulse-title">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p id="newsletter-pulse-title" className="section-label">AI, But clearer</p>
          <Newspaper size={12} className="text-ink-faint" aria-hidden="true" />
        </div>
        <Link href="/newsletter" prefetch={false} className="inline-flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink">
          Stato progetto <ArrowUpRight size={12} />
        </Link>
      </div>
      <div className="card overflow-hidden p-0">
        {signals.map((signal, index) => (
          <div key={`${signal.label}-${signal.value}`} className={`grid grid-cols-[6rem_1fr] gap-3 px-5 py-3.5 ${index ? 'border-t border-border' : ''}`}>
            <div className="flex items-center gap-2 pt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${DOTS[signal.tone]}`} />
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">{signal.label}</span>
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-ink">{signal.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
