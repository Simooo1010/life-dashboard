import { describe, expect, it } from 'vitest'
import { getTransactionEffect, getWalletBalances, parseTransaction } from './transactions'
import type { RawTransaction } from './raw-types'

function tx(overrides: Partial<RawTransaction>): RawTransaction {
  return {
    id: overrides.id ?? 'tx-1',
    created_at: overrides.created_at ?? '2026-09-10T12:00:00.000Z',
    title: overrides.title ?? 'Test',
    amount: overrides.amount ?? 10,
    type: overrides.type ?? 'expense',
  }
}

describe('parseTransaction', () => {
  it('extracts the wallet slug from a plain title tag', () => {
    const t = tx({ title: 'Pizza [busta]' })
    const parsed = parseTransaction(t, 'generale')
    expect(parsed.wallet).toBe('busta')
    expect(parsed.cleanTitle).toBe('Pizza')
    expect(parsed.isTransfer).toBe(false)
    expect(parsed.isDebt).toBe(false)
  })

  it('flags a transfer tag and still resolves the wallet', () => {
    const t = tx({ title: 'Spostamento [apple-transfer]' })
    const parsed = parseTransaction(t, 'generale')
    expect(parsed.wallet).toBe('apple')
    expect(parsed.isTransfer).toBe(true)
    expect(parsed.cleanTitle).toBe('Spostamento')
  })

  it('falls back to the default wallet when there is no tag', () => {
    const t = tx({ title: 'Stipendio' })
    const parsed = parseTransaction(t, 'generale')
    expect(parsed.wallet).toBe('generale')
    expect(parsed.cleanTitle).toBe('Stipendio')
  })

  it('parses a well-formed debt-encoded title', () => {
    const debtJson = JSON.stringify({ type: 'to_me', person: 'Marco', desc: 'Prestito PS5', status: 'active' })
    const t = tx({ title: `[DEBT:${debtJson}] [generale]` })
    const parsed = parseTransaction(t, 'generale')
    expect(parsed.isDebt).toBe(true)
    expect(parsed.debtInfo).toEqual({ type: 'to_me', person: 'Marco', desc: 'Prestito PS5', status: 'active' })
    expect(parsed.cleanTitle).toBe('Marco: Prestito PS5')
    expect(parsed.wallet).toBe('generale')
  })

  it('degrades gracefully on a malformed debt title instead of throwing', () => {
    const t = tx({ title: '[DEBT:{not valid json' })
    expect(() => parseTransaction(t, 'generale')).not.toThrow()
    const parsed = parseTransaction(t, 'generale')
    expect(parsed.isDebt).toBe(true)
    expect(parsed.debtInfo).toBeNull()
  })
})

describe('getTransactionEffect', () => {
  it('treats a plain income transaction as income', () => {
    const t = tx({ type: 'income', amount: 50 })
    expect(getTransactionEffect(t)).toEqual({ income: 50, expense: 0 })
  })

  it('treats a plain expense transaction as expense', () => {
    const t = tx({ type: 'expense', amount: 20 })
    expect(getTransactionEffect(t)).toEqual({ income: 0, expense: 20 })
  })

  it('treats lending money out (active "to_me" debt) as an expense', () => {
    const debtJson = JSON.stringify({ type: 'to_me', person: 'Marco', desc: 'Prestito', status: 'active' })
    const t = tx({ title: `[DEBT:${debtJson}] [generale]`, amount: 30 })
    expect(getTransactionEffect(t)).toEqual({ income: 0, expense: 30 })
  })

  it('treats borrowing money (active "by_me" debt) as income', () => {
    const debtJson = JSON.stringify({ type: 'by_me', person: 'Giulia', desc: 'Prestito', status: 'active' })
    const t = tx({ title: `[DEBT:${debtJson}] [generale]`, amount: 15 })
    expect(getTransactionEffect(t)).toEqual({ income: 15, expense: 0 })
  })

  it('zeroes out a completed debt so it no longer affects balances', () => {
    const debtJson = JSON.stringify({ type: 'to_me', person: 'Marco', desc: 'Prestito', status: 'completed' })
    const t = tx({ title: `[DEBT:${debtJson}] [generale]`, amount: 30 })
    expect(getTransactionEffect(t)).toEqual({ income: 0, expense: 0 })
  })
})

describe('getWalletBalances', () => {
  it('sums income and expense per wallet independently', () => {
    const transactions: RawTransaction[] = [
      tx({ id: '1', title: 'Stipendio [generale]', type: 'income', amount: 100 }),
      tx({ id: '2', title: 'Pizza [generale]', type: 'expense', amount: 20 }),
      tx({ id: '3', title: 'Regalo [busta]', type: 'income', amount: 50 }),
      tx({ id: '4', title: 'Libro [busta]', type: 'expense', amount: 15 }),
    ]
    const balances = getWalletBalances(transactions, ['generale', 'busta'], 'generale')
    expect(balances.generale).toBe(80)
    expect(balances.busta).toBe(35)
  })

  it('initializes every known wallet slug to zero even with no transactions', () => {
    const balances = getWalletBalances([], ['generale', 'busta', 'apple'], 'generale')
    expect(balances).toEqual({ generale: 0, busta: 0, apple: 0 })
  })

  it('discovers a wallet slug that was not in the known list', () => {
    const transactions: RawTransaction[] = [tx({ title: 'Extra [nuovo]', type: 'income', amount: 5 })]
    const balances = getWalletBalances(transactions, ['generale'], 'generale')
    expect(balances.nuovo).toBe(5)
  })
})
