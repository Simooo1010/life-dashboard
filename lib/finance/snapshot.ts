import { fetchRawTransactions, fetchRawWallets, isFinanceConfigured } from './client'
import { getTransactionEffect, getWalletBalances, parseTransaction } from './transactions'
import type { RawTransaction, RawWallet } from './raw-types'
import type { DebtsSummary, FinancePeriodStats, FinanceSnapshot, NormalizedTransaction, WalletBalance } from './types'

const DEFAULT_WALLET = 'generale'
const RECENT_TRANSACTIONS_LIMIT = 30

function isRealMovement(t: RawTransaction): boolean {
  // Transfers between the user's own wallets aren't income/expense — exclude
  // them from period stats the same way the tracker's own AI report does.
  return !t.title.endsWith('-transfer]')
}

function computePeriodStats(transactions: RawTransaction[], defaultWallet: string): FinancePeriodStats {
  const real = transactions.filter(isRealMovement)
  let income = 0
  let expense = 0
  real.forEach(t => {
    const effect = getTransactionEffect(t, defaultWallet)
    income += effect.income
    expense += effect.expense
  })
  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
    transactionCount: real.length,
  }
}

function buildSnapshot(wallets: RawWallet[], transactions: RawTransaction[]): FinanceSnapshot {
  const defaultWallet = wallets.find(w => w.position === 0)?.slug ?? DEFAULT_WALLET
  const walletSlugs = wallets.map(w => w.slug)
  const walletNameBySlug = new Map(wallets.map(w => [w.slug, w.name]))

  const balances = getWalletBalances(transactions, walletSlugs, defaultWallet)
  const walletBalances: WalletBalance[] = wallets.map(w => ({
    slug: w.slug,
    name: w.name,
    description: w.description,
    balance: balances[w.slug] ?? 0,
  }))
  const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0)

  const recentTransactions: NormalizedTransaction[] = transactions
    .slice(0, RECENT_TRANSACTIONS_LIMIT)
    .map(t => {
      const parsed = parseTransaction(t, defaultWallet)
      return {
        id: t.id,
        date: t.created_at,
        title: parsed.cleanTitle,
        amount: Number(t.amount),
        type: t.type,
        walletSlug: parsed.wallet,
        walletName: walletNameBySlug.get(parsed.wallet) ?? parsed.wallet,
        isTransfer: parsed.isTransfer,
        isDebt: parsed.isDebt,
        debt: parsed.debtInfo ?? undefined,
      }
    })

  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const last30 = transactions.filter(t => new Date(t.created_at).getTime() >= thirtyDaysAgo)
  const last7 = last30.filter(t => new Date(t.created_at).getTime() >= sevenDaysAgo)

  const debtItems = transactions
    .map(t => ({ amount: Number(t.amount), ...parseTransaction(t, defaultWallet) }))
    .filter(d => d.isDebt && d.debtInfo && d.debtInfo.status === 'active')

  const debts: DebtsSummary = {
    totalCredits: debtItems
      .filter(d => d.debtInfo!.type === 'to_me')
      .reduce((sum, d) => sum + d.amount, 0),
    totalDebts: debtItems
      .filter(d => d.debtInfo!.type === 'by_me')
      .reduce((sum, d) => sum + d.amount, 0),
    items: debtItems.map(d => ({
      person: d.debtInfo!.person,
      desc: d.debtInfo!.desc,
      amount: d.amount,
      type: d.debtInfo!.type,
    })),
  }

  return {
    totalBalance,
    wallets: walletBalances,
    recentTransactions,
    last7Days: computePeriodStats(last7, defaultWallet),
    last30Days: computePeriodStats(last30, defaultWallet),
    debts,
    fetchedAt: new Date().toISOString(),
  }
}

// ─── Memory cache (10 minutes TTL) ─────────────────────────────────────────────
// Mirrors lib/weather/client.ts — best-effort per-instance cache. Keeps the
// dashboard from hitting the tracker's Supabase project on every render while
// staying reasonably fresh; a forced refresh is available for the dedicated
// finance page.
let cachedSnapshot: FinanceSnapshot | null = null
let cacheExpiresAt = 0
const TTL_MS = 10 * 60 * 1000

export async function fetchFinanceSnapshot(forceRefresh = false): Promise<FinanceSnapshot> {
  if (!isFinanceConfigured()) {
    throw new Error('[Finance] integration not configured')
  }

  const now = Date.now()
  if (!forceRefresh && cachedSnapshot && now < cacheExpiresAt) {
    return cachedSnapshot
  }

  const [wallets, transactions] = await Promise.all([fetchRawWallets(), fetchRawTransactions()])
  const snapshot = buildSnapshot(wallets, transactions)

  cachedSnapshot = snapshot
  cacheExpiresAt = now + TTL_MS
  return snapshot
}
