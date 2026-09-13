import type { FinanceSnapshot } from '@/lib/finance/types'
import Link from 'next/link'
import { Wallet, Sparkles, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react'

interface FinanceSectionProps {
  snapshot: FinanceSnapshot | null
  observations: string[] | null
  configured: boolean
}

function formatEuro(amount: number): string {
  return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function FinanceSection({ snapshot, observations, configured }: FinanceSectionProps) {
  if (!configured) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="section-label">Finanze</p>
          <Wallet size={12} className="cat-finance" />
        </div>
        <Link href="/finance" className="text-xs text-ink-muted hover:text-accent transition-colors">
          Vai alle finanze →
        </Link>
      </div>

      {!snapshot ? (
        <div className="card text-center py-5">
          <p className="text-xs text-ink-faint">Dati finanziari temporaneamente non disponibili.</p>
        </div>
      ) : (
        <div className="card space-y-4">
          {/* ─── Total balance ─────────────────────────────────────────── */}
          <div className="flex items-baseline justify-between border-b border-border pb-3.5">
            <div>
              <p className="text-2xs uppercase tracking-wider text-ink-faint font-medium">Saldo totale</p>
              <p className="text-2xl font-semibold text-ink tabular-nums">{formatEuro(snapshot.totalBalance)}</p>
            </div>
            {snapshot.last7Days.savingsRate !== null && (
              <div className="text-right">
                <p className="text-2xs text-ink-faint">Risparmio 7gg</p>
                <p className={`text-sm font-semibold tabular-nums ${snapshot.last7Days.savingsRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {snapshot.last7Days.savingsRate.toFixed(0)}%
                </p>
              </div>
            )}
          </div>

          {/* ─── Recent transactions ───────────────────────────────────── */}
          {snapshot.recentTransactions.length > 0 && (
            <div>
              <p className="text-2xs uppercase tracking-wider text-ink-faint font-medium mb-2">
                Transazioni recenti
              </p>
              <div className="space-y-1.5">
                {snapshot.recentTransactions.slice(0, 4).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {tx.isTransfer ? (
                        <ArrowLeftRight size={12} className="text-ink-faint shrink-0" />
                      ) : tx.type === 'income' ? (
                        <ArrowUpRight size={12} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowDownRight size={12} className="text-rose-500 shrink-0" />
                      )}
                      <span className="text-ink truncate">{tx.title || tx.walletName}</span>
                    </div>
                    <span
                      className={`tabular-nums font-medium shrink-0 ${
                        tx.isTransfer ? 'text-ink-faint' : tx.type === 'income' ? 'text-emerald-700' : 'text-ink-muted'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '−'}{formatEuro(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── AI observations ───────────────────────────────────────── */}
          {observations && observations.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="text-2xs uppercase tracking-wider text-ink-faint font-medium flex items-center gap-1">
                <Sparkles size={11} className="text-accent" /> Osservazioni
              </p>
              <ul className="space-y-1">
                {observations.slice(0, 5).map((obs, i) => (
                  <li key={i} className="text-xs text-ink-muted leading-relaxed flex gap-1.5">
                    <span className="text-ink-faint">·</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
