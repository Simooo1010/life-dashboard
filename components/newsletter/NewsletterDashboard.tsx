import type { CalendarEvent } from '@/lib/calendar/google'
import type { NewsletterComponent, NewsletterProjectState, NewsletterStateItem } from '@/lib/newsletter/types'
import { AlertCircle, ArrowUpRight, Check, CircleHelp, ExternalLink, FlaskConical, Lightbulb, Milestone, Network, Sparkles } from 'lucide-react'

function evidenceUrl(state: NewsletterProjectState, item: { evidenceBlockIds: string[] }): string {
  const blockId = item.evidenceBlockIds[0]?.replace(/-/g, '')
  return blockId ? `${state.source.pageUrl}#${blockId}` : state.source.pageUrl
}

function ItemList({ state, items, tone }: { state: NewsletterProjectState; items: NewsletterStateItem[]; tone: 'green' | 'amber' | 'violet' | 'blue' | 'rose' | 'neutral' }) {
  const styles = {
    green: 'border-l-emerald-400', amber: 'border-l-amber-400', violet: 'border-l-violet-400',
    blue: 'border-l-blue-400', rose: 'border-l-rose-400', neutral: 'border-l-border',
  }
  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <article key={item.id} className={`card border-l-2 py-4 ${styles[tone]}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-relaxed text-ink">{item.title}</p>
              {item.detail && <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{item.detail}</p>}
              {item.date && <p className="mt-2 font-mono text-2xs text-ink-faint">{new Date(`${item.date}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
            </div>
            <a href={evidenceUrl(state, item)} target="_blank" rel="noopener noreferrer" aria-label="Apri l'evidenza in Notion" className="mt-0.5 shrink-0 text-ink-faint transition-colors hover:text-accent">
              <ArrowUpRight size={14} />
            </a>
          </div>
        </article>
      ))}
    </div>
  )
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-ink-faint">{icon}</span>
        <h2 className="section-label">{title}</h2>
        {count !== undefined && <span className="font-mono text-2xs text-ink-faint">{count}</span>}
      </div>
      {children}
    </section>
  )
}

function ComponentGrid({ state, components }: { state: NewsletterProjectState; components: NewsletterComponent[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {components.map(component => (
        <a key={component.id} href={evidenceUrl(state, component)} target="_blank" rel="noopener noreferrer" className="card group py-4 transition-colors hover:border-amber-300">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{component.name}</p>
            {component.status && <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-2xs uppercase tracking-wide text-ink-muted">{component.status}</span>}
          </div>
          {component.detail && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-muted">{component.detail}</p>}
        </a>
      ))}
    </div>
  )
}

function Pulse({ state, events }: { state: NewsletterProjectState; events: CalendarEvent[] }) {
  const fields = [
    ['Stato', state.pulse.currentState], ['Fase', state.pulse.phase], ['Focus adesso', state.pulse.currentFocus],
    ['Ultimo cambiamento', state.pulse.latestMeaningfulChange], ['Prossima tappa', state.pulse.nextMilestone],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-surface shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-300 via-orange-500 to-amber-700" />
      <div className="p-5 pl-7 md:p-7 md:pl-9">
        <p className="mb-5 font-mono text-2xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Project pulse / live</p>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {fields.map(([label, value], index) => (
            <div key={label} className={index === 2 ? 'sm:col-span-2' : ''}>
              <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
              <p className={`${index === 2 ? 'text-base font-medium' : 'text-sm'} leading-relaxed text-ink`}>{value}</p>
            </div>
          ))}
        </div>
        {events.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">Dal calendario</p>
            <div className="flex flex-wrap gap-2">
              {events.slice(0, 3).map(event => <span key={event.id} className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-300">{event.title} · {new Date(`${event.start.split('T')[0]}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function NewsletterDashboard({ state, events }: { state: NewsletterProjectState; events: CalendarEvent[] }) {
  const hasOperationalContent = Boolean(Object.values(state.pulse).some(value => typeof value === 'string')) || [state.decisions, state.hypotheses, state.openQuestions, state.blockers, state.components, state.recentChanges, state.milestones, state.additionalSections].some(section => section.length > 0)
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8 md:py-10">
      <header className="flex items-start justify-between gap-5">
        <div>
          <p className="mb-2 font-mono text-2xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Newsletter / project control</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{state.projectName}</h1>
          <p className="mt-2 text-sm text-ink-muted">Ciò che conta adesso, interpretato dalla fonte di verità.</p>
        </div>
        <a href={state.source.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white dark:bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-amber-300 hover:text-ink">
          Notion <ExternalLink size={12} />
        </a>
      </header>

      {hasOperationalContent ? <Pulse state={state} events={events} /> : <div className="card text-sm text-ink-muted">La fonte non espone ancora uno stato operativo affidabile. Il brief resta disponibile in Notion.</div>}

      {state.decisions.length > 0 && <Section title="Decisioni correnti" icon={<Check size={14} />} count={state.decisions.length}><ItemList state={state} items={state.decisions} tone="green" /></Section>}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        {state.openQuestions.length > 0 && <Section title="Questioni aperte" icon={<CircleHelp size={14} />} count={state.openQuestions.length}><ItemList state={state} items={state.openQuestions} tone="amber" /></Section>}
        {state.blockers.length > 0 && <Section title="Blocchi" icon={<AlertCircle size={14} />} count={state.blockers.length}><ItemList state={state} items={state.blockers} tone="rose" /></Section>}
      </div>
      {state.hypotheses.length > 0 && <Section title="Ipotesi attive" icon={<FlaskConical size={14} />} count={state.hypotheses.length}><ItemList state={state} items={state.hypotheses} tone="violet" /></Section>}
      {state.recommendations.length > 0 && <Section title="Raccomandazioni non decise" icon={<Lightbulb size={14} />} count={state.recommendations.length}><ItemList state={state} items={state.recommendations} tone="blue" /></Section>}
      {state.components.length > 0 && <Section title="Ecosistema attuale" icon={<Network size={14} />} count={state.components.length}><ComponentGrid state={state} components={state.components} /></Section>}
      {state.recentChanges.length > 0 && <Section title="Cambiamenti significativi" icon={<Sparkles size={14} />} count={state.recentChanges.length}><ItemList state={state} items={state.recentChanges} tone="blue" /></Section>}
      {state.milestones.length > 0 && <Section title="Tappe già nella fonte" icon={<Milestone size={14} />} count={state.milestones.length}><ItemList state={state} items={state.milestones} tone="neutral" /></Section>}
      {state.additionalSections.map(section => <Section key={section.id} title={section.title} count={section.items.length} icon={<Sparkles size={14} />}><ItemList state={state} items={section.items} tone="neutral" /></Section>)}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-2xs text-ink-faint">
        <span>Fonte aggiornata {new Date(state.source.lastEditedAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <span>Dati derivati · cache massima 5 min · Notion resta autorevole</span>
      </footer>
    </div>
  )
}
