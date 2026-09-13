import { AppShell } from '@/components/layout/AppShell'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { ExternalLink, ShieldCheck, HeartPulse, Sparkles, Compass } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LifeOsPage() {
  const data = await fetchLifeOsData()

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Compass size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink">Life OS Managing</h1>
              <p className="text-xs text-ink-muted">Linee guida e limiti operativi</p>
            </div>
          </div>
          <a
            href={data.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium"
          >
            Apri in Notion <ExternalLink size={12} />
          </a>
        </div>

        {/* ─── Core Boundary Banner ─────────────────────────────────── */}
        <div className="card bg-surface/70 border-border/80 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            <p className="text-xs font-semibold text-ink uppercase tracking-wider">
              Confine Operativo Fondamentale
            </p>
          </div>
          <p className="text-sm text-ink leading-relaxed">
            L’AI legge dati esistenti, prepara bozze e suggerisce liberamente, ma non ha alcun ruolo
            nella pianificazione autonoma del tempo. L’umano vive la vita come persona, non come
            macchina a esecuzione continua.
          </p>
        </div>

        {/* ─── Principles list ──────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Principi Chiave</p>
          <div className="card divide-y divide-border -my-px">
            {data.items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className="text-xs font-mono text-ink-faint w-4 shrink-0 text-right mt-0.5">
                  {i + 1}.
                </span>
                <p className="text-sm text-ink leading-relaxed">{item.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Specific operating rules ─────────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Regole Operative</p>
          <div className="space-y-3">
            {data.sources.map((rule, idx) => (
              <div key={idx} className="card space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-ink-muted" />
                  <p className="text-sm font-semibold text-ink">{rule.label}</p>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{rule.message ?? rule.state}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Emergency mode notice ────────────────────────────────── */}
        <section className="card bg-amber-50/70 border-amber-200/80 space-y-2">
          <div className="flex items-center gap-2">
            <HeartPulse size={15} className="text-amber-700" />
            <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Emergency Mode (Giornate Intense)
            </p>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Attivabile su conferma esplicita quando si sovrappongono studio intensivo, allenamenti
            lunghi e impegni: in quel caso l’AI offre raccomandazioni più dirette e operative per
            ridurre a zero il carico decisionale.
          </p>
        </section>
      </div>
    </AppShell>
  )
}
