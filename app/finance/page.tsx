import { AppShell } from '@/components/layout/AppShell'
import { isFinanceConfigured } from '@/lib/finance/client'
import { loadCachedFinanceSnapshot } from '@/lib/cache/dashboard-data'
import { getFinanceInsights } from '@/lib/groq/finance-insights'
import type { FinanceSnapshot } from '@/lib/finance/types'
import { Suspense } from 'react'
import {
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  HandCoins,
  ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function FinanceInsightsPanel({ snapshot }: { snapshot: FinanceSnapshot }) {
  const insights = await getFinanceInsights(snapshot, 'full')
  const observations = insights?.observations ?? null
  if (!observations?.length) return null

  return (
    <div className="card bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-900/40 space-y-2.5">
      <p className="text-2xs uppercase tracking-wider font-semibold text-ink-muted flex items-center gap-1.5">
        <Sparkles size={13} className="text-purple-600 dark:text-purple-400" /> Interpretazione AI
      </p>
      <ul className="space-y-1.5">
        {observations.map((observation, index) => (
          <li key={index} className="text-sm text-ink leading-relaxed flex gap-2">
            <span className="text-purple-500 dark:text-purple-400">·</span>
            <span>{observation}</span>
          </li>
        ))}
      </ul>
      <p className="text-2xs text-ink-faint pt-1 border-t border-purple-200/50 dark:border-purple-900/30">
        Interpretazione generata dall&apos;AI sui dati reali sottostanti — non è consulenza finanziaria.
      </p>
    </div>
  )
}

function FinanceInsightsFallback() {
  return <div aria-busy="true" aria-label="Interpretazione finanziaria in caricamento" className="card h-20 animate-pulse bg-purple-50/30 dark:bg-purple-950/10" />
}

function formatEuro(amount: number): string {
  return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default async function FinancePage() {
  const configured = isFinanceConfigured()

  let snapshot: FinanceSnapshot | null = null
  let loadError = false

  if (configured) {
    try {
      snapshot = await loadCachedFinanceSnapshot()
    } catch (error) {
      console.error('[FinancePage]', error)
      loadError = true
    }
  }

  if (!configured) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          <h1 className="text-xl font-semibold text-ink mb-4">Finanze</h1>
          <div className="card text-center py-8 space-y-1.5">
            <p className="text-sm text-ink">Integrazione con il Personal Finance Tracker non configurata.</p>
            <p className="text-xs text-ink-faint">
              Imposta FINANCE_SUPABASE_URL, FINANCE_SUPABASE_SERVICE_ROLE_KEY e FINANCE_USER_ID nelle variabili d&apos;ambiente.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!snapshot || loadError) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          <h1 className="text-xl font-semibold text-ink mb-4">Finanze</h1>
          <div className="card text-center py-8">
            <p className="text-sm text-red-600 dark:text-red-400">Dati finanziari non disponibili al momento.</p>
            <p className="text-xs text-ink-faint mt-1">Il Personal Finance Tracker potrebbe essere temporaneamente irraggiungibile.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const hasDebts = snapshot.debts.items.length > 0

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
              <Wallet size={18} className="cat-finance" /> Finanze
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">Dal Personal Finance Tracker</p>
          </div>
          {process.env.FINANCE_APP_URL && (
            <a
              href={process.env.FINANCE_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xs text-ink-faint hover:text-ink-muted inline-flex items-center gap-1 transition-colors"
            >
              Apri il tracker <ExternalLink size={10} />
            </a>
          )}
        </div>

        {/* ─── AI interpretation ──────────────────────────────────── */}
        <Suspense fallback={<FinanceInsightsFallback />}>
          <FinanceInsightsPanel snapshot={snapshot} />
        </Suspense>

        {/* ─── Balance overview ───────────────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Panoramica</p>
          <div className="card space-y-4">
            <div>
              <p className="text-2xs uppercase tracking-wider text-ink-faint font-medium">Saldo totale</p>
              <p className="text-3xl font-bold text-ink tabular-nums">{formatEuro(snapshot.totalBalance)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              {[
                { label: '7 giorni', stats: snapshot.last7Days },
                { label: '30 giorni', stats: snapshot.last30Days },
              ].map(({ label, stats }) => (
                <div key={label} className="space-y-1">
                  <p className="text-2xs uppercase tracking-wider text-ink-faint font-medium">{label}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <ArrowUpRight size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-ink-muted tabular-nums">{formatEuro(stats.income)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <ArrowDownRight size={12} className="text-rose-500 dark:text-rose-400" />
                    <span className="text-ink-muted tabular-nums">{formatEuro(stats.expense)}</span>
                  </div>
                  {stats.savingsRate !== null && (
                    <p className={`text-xs font-semibold tabular-nums ${stats.savingsRate >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {stats.savingsRate.toFixed(0)}% risparmiato
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Wallets ─────────────────────────────────────────────── */}
        {snapshot.wallets.length > 0 && (
          <section className="space-y-3">
            <p className="section-label">Portafogli</p>
            <div className="card p-0 divide-y divide-border -my-px">
              {snapshot.wallets.map(w => (
                <div key={w.slug} className="flex items-center justify-between px-5 py-3.5 first:pt-4 last:pb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{w.name}</p>
                    {w.description && <p className="text-2xs text-ink-faint truncate">{w.description}</p>}
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums shrink-0">{formatEuro(w.balance)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Debts & credits ────────────────────────────────────── */}
        {hasDebts && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="section-label">Debiti e crediti</p>
              <HandCoins size={12} className="text-ink-faint" />
            </div>
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xs text-ink-faint">Crediti attivi</p>
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatEuro(snapshot.debts.totalCredits)}</p>
                </div>
                <div>
                  <p className="text-2xs text-ink-faint">Debiti attivi</p>
                  <p className="text-lg font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatEuro(snapshot.debts.totalDebts)}</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-border">
                {snapshot.debts.items.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted truncate">
                      {d.type === 'to_me' ? 'Da' : 'Verso'} <span className="text-ink font-medium">{d.person}</span> — {d.desc}
                    </span>
                    <span className={`tabular-nums font-medium shrink-0 ml-2 ${d.type === 'to_me' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {formatEuro(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Recent activity ────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Attività recente</p>
          <div className="card p-0 divide-y divide-border -my-px">
            {snapshot.recentTransactions.length === 0 && (
              <p className="text-xs text-ink-faint text-center py-6">Nessuna transazione registrata.</p>
            )}
            {snapshot.recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3 first:pt-4 last:pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0">
                    {tx.isTransfer ? (
                      <ArrowLeftRight size={13} className="text-ink-faint" />
                    ) : tx.type === 'income' ? (
                      <ArrowUpRight size={13} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowDownRight size={13} className="text-rose-500 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{tx.title || tx.walletName}</p>
                    <p className="text-2xs text-ink-faint">{formatDate(tx.date)} · {tx.walletName}</p>
                  </div>
                </div>
                <span
                  className={`text-sm tabular-nums font-medium shrink-0 ${
                    tx.isTransfer ? 'text-ink-faint' : tx.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '−'}{formatEuro(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <footer className="text-center text-2xs text-ink-faint pb-2">
          Dati sincronizzati alle {new Date(snapshot.fetchedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </footer>
      </div>
    </AppShell>
  )
}
