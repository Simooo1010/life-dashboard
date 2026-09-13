import type { KnowledgeNode } from '@/lib/notion/second-brain'
import Link from 'next/link'
import { Brain, Inbox } from 'lucide-react'
import { CategoryBadge } from '@/components/common/Badge'

interface SecondBrainSectionProps {
  recentConcepts: KnowledgeNode[]
  unprocessedCount: number
  insight?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Concept':           'text-blue-700',
  'Framework':         'text-purple-700',
  'Habit & Practice':  'text-green-700',
  'Person':            'text-amber-700',
  'Book':              'text-rose-700',
}

export function SecondBrainSection({ recentConcepts, unprocessedCount, insight }: SecondBrainSectionProps) {
  const hasContent = recentConcepts.length > 0 || unprocessedCount > 0 || insight

  if (!hasContent) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="section-label">Secondo Cervello</p>
          <Brain size={12} className="text-ink-faint" />
        </div>
        <Link href="/second-brain" className="text-xs text-ink-muted hover:text-ink transition-colors">
          Esplora →
        </Link>
      </div>

      <div className="card space-y-4">
        {/* AI Insight */}
        {insight && (
          <p className="text-sm text-ink leading-relaxed italic border-l-2 border-accent/40 pl-3">
            {insight}
          </p>
        )}

        {/* Recent concepts */}
        {recentConcepts.length > 0 && (
          <div>
            <p className="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Concetti recenti
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentConcepts.slice(0, 8).map(node => (
                <a
                  key={node.id}
                  href={node.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs px-2 py-1 bg-surface rounded-lg hover:bg-border transition-colors ${
                    node.category ? (CATEGORY_COLORS[node.category] ?? 'text-ink-muted') : 'text-ink-muted'
                  }`}
                >
                  {node.concept}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Unprocessed sources */}
        {unprocessedCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Inbox size={12} className="text-ink-faint" />
              <span className="text-xs text-ink-muted">Fonti da processare</span>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {unprocessedCount}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
