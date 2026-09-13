import { describe, expect, it } from 'vitest'
import { buildSnapshot, computePeriodStats } from './snapshot'
import type { RawTransaction, RawWallet } from './raw-types'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

function wallet(overrides: Partial<RawWallet>): RawWallet {
  return {
    id: overrides.id ?? 'w-1',
    user_id: 'user-1',
    slug: overrides.slug ?? 'generale',
    name: overrides.name ?? 'Generale',
    description: overrides.description ?? null,
    position: overrides.position ?? 0,
    created_at: overrides.created_at ?? daysAgo(365),
  }
}

function tx(overrides: Partial<RawTransaction>): RawTransaction {
  return {
    id: overrides.id ?? 'tx-1',
    created_at: overrides.created_at ?? daysAgo(1),
    title: overrides.title ?? 'Test [generale]',
    amount: overrides.amount ?? 10,
    type: overrides.type ?? 'expense',
  }
}

describe('computePeriodStats', () => {
  it('computes income, expense, net and savings rate', () => {
    const stats = computePeriodStats(
      [
        tx({ type: 'income', amount: 100 }),
        tx({ type: 'expense', amount: 40 }),
      ],
      'generale',
    )
    expect(stats).toEqual({ income: 100, expense: 40, net: 60, savingsRate: 60, transactionCount: 2 })
  })

  it('returns a null savings rate when there was no income', () => {
    const stats = computePeriodStats([tx({ type: 'expense', amount: 20 })], 'generale')
    expect(stats.savingsRate).toBeNull()
  })

  it('excludes internal wallet-to-wallet transfers from the totals', () => {
    const stats = computePeriodStats(
      [
        tx({ type: 'income', amount: 100 }),
        tx({ title: 'Spostamento [busta-transfer]', type: 'expense', amount: 30 }),
      ],
      'generale',
    )
    expect(stats.income).toBe(100)
    expect(stats.expense).toBe(0)
    expect(stats.transactionCount).toBe(1)
  })
})

describe('buildSnapshot', () => {
  const wallets: RawWallet[] = [
    wallet({ slug: 'generale', name: 'Generale', position: 0 }),
    wallet({ id: 'w-2', slug: 'busta', name: 'Busta', position: 1 }),
  ]

  it('computes per-wallet and total balances', () => {
    const transactions: RawTransaction[] = [
      tx({ id: '1', title: 'Stipendio [generale]', type: 'income', amount: 200 }),
      tx({ id: '2', title: 'Bollette [generale]', type: 'expense', amount: 50 }),
      tx({ id: '3', title: 'Mancia [busta]', type: 'income', amount: 30 }),
    ]
    const snapshot = buildSnapshot(wallets, transactions)
    expect(snapshot.wallets).toEqual([
      { slug: 'generale', name: 'Generale', description: null, balance: 150 },
      { slug: 'busta', name: 'Busta', description: null, balance: 30 },
    ])
    expect(snapshot.totalBalance).toBe(180)
  })

  it('normalizes recent transactions with clean titles and wallet names', () => {
    const transactions: RawTransaction[] = [tx({ id: '1', title: 'Pizza [busta]', type: 'expense', amount: 12.5 })]
    const snapshot = buildSnapshot(wallets, transactions)
    expect(snapshot.recentTransactions[0]).toMatchObject({
      id: '1',
      title: 'Pizza',
      amount: 12.5,
      type: 'expense',
      walletSlug: 'busta',
      walletName: 'Busta',
      isTransfer: false,
      isDebt: false,
    })
  })

  it('buckets transactions into the correct 7-day and 30-day windows', () => {
    const transactions: RawTransaction[] = [
      tx({ id: 'today', created_at: daysAgo(1), type: 'expense', amount: 5 }),
      tx({ id: 'week', created_at: daysAgo(5), type: 'expense', amount: 7 }),
      tx({ id: 'month', created_at: daysAgo(20), type: 'expense', amount: 11 }),
      tx({ id: 'old', created_at: daysAgo(45), type: 'expense', amount: 999 }),
    ]
    const snapshot = buildSnapshot(wallets, transactions)
    expect(snapshot.last7Days.expense).toBe(12)   // today + week
    expect(snapshot.last30Days.expense).toBe(23)  // today + week + month, not "old"
  })

  it('aggregates active debts into credits/debts totals and excludes completed ones', () => {
    const activeCredit = JSON.stringify({ type: 'to_me', person: 'Marco', desc: 'Prestito', status: 'active' })
    const activeDebt = JSON.stringify({ type: 'by_me', person: 'Giulia', desc: 'Prestito libri', status: 'active' })
    const completedDebt = JSON.stringify({ type: 'by_me', person: 'Luca', desc: 'Vecchio prestito', status: 'completed' })
    const transactions: RawTransaction[] = [
      tx({ id: '1', title: `[DEBT:${activeCredit}] [generale]`, amount: 40 }),
      tx({ id: '2', title: `[DEBT:${activeDebt}] [generale]`, amount: 25 }),
      tx({ id: '3', title: `[DEBT:${completedDebt}] [generale]`, amount: 999 }),
    ]
    const snapshot = buildSnapshot(wallets, transactions)
    expect(snapshot.debts.totalCredits).toBe(40)
    expect(snapshot.debts.totalDebts).toBe(25)
    expect(snapshot.debts.items).toHaveLength(2)
    expect(snapshot.debts.items.map(i => i.person).sort()).toEqual(['Giulia', 'Marco'])
  })

  it('returns an empty-but-valid snapshot when there is no data at all', () => {
    const snapshot = buildSnapshot([], [])
    expect(snapshot.totalBalance).toBe(0)
    expect(snapshot.wallets).toEqual([])
    expect(snapshot.recentTransactions).toEqual([])
    expect(snapshot.debts).toEqual({ totalCredits: 0, totalDebts: 0, items: [] })
    expect(snapshot.last7Days.savingsRate).toBeNull()
  })
})
