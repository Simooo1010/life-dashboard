import type { RawTransaction } from './raw-types'

// Ported from the Personal Finance Tracker's lib/transactions.ts. The tracker
// has no accounts/categories tables — wallet and debt semantics are encoded
// into the transaction title string. This parsing logic is small and stable,
// so it's copied here rather than depended on at runtime, keeping this
// dashboard decoupled from the tracker's own source tree.

export interface DebtInfo {
  type: 'to_me' | 'by_me'
  person: string
  desc: string
  status: 'active' | 'completed'
}

export interface ParsedTransaction {
  transaction: RawTransaction
  isDebt: boolean
  debtInfo: DebtInfo | null
  isTransfer: boolean
  wallet: string
  cleanTitle: string
}

const WALLET_TAG_REGEX = /\s*\[([a-zA-Z0-9_-]+?)(-transfer)?\]$/

export function parseTransaction(t: RawTransaction, defaultWallet = 'generale'): ParsedTransaction {
  const title = t.title

  let isDebt = false
  let debtInfo: DebtInfo | null = null
  let cleanTitle = title

  if (title.startsWith('[DEBT:')) {
    isDebt = true
    try {
      const endJsonIndex = title.lastIndexOf('] [')
      if (endJsonIndex !== -1) {
        const jsonStr = title.substring(6, endJsonIndex)
        const info = JSON.parse(jsonStr)
        debtInfo = { type: info.type, person: info.person, desc: info.desc, status: info.status }
        cleanTitle = `${info.person}: ${info.desc}`
      }
    } catch {
      // Malformed debt-encoded title — fall back to showing the raw title.
    }
  }

  let wallet = defaultWallet
  let isTransfer = false
  const match = title.match(WALLET_TAG_REGEX)
  if (match) {
    wallet = match[1]
    isTransfer = Boolean(match[2])
  }

  if (!isDebt) {
    cleanTitle = title.replace(WALLET_TAG_REGEX, '').trim()
  }

  return { transaction: t, isDebt, debtInfo, isTransfer, wallet, cleanTitle }
}

export function getTransactionEffect(t: RawTransaction, defaultWallet = 'generale'): { income: number; expense: number } {
  const parsed = parseTransaction(t, defaultWallet)
  if (parsed.isDebt && parsed.debtInfo) {
    if (parsed.debtInfo.status === 'completed') return { income: 0, expense: 0 }
    return parsed.debtInfo.type === 'to_me'
      ? { income: 0, expense: Number(t.amount) }
      : { income: Number(t.amount), expense: 0 }
  }

  return t.type === 'income'
    ? { income: Number(t.amount), expense: 0 }
    : { income: 0, expense: Number(t.amount) }
}

export function getWalletBalances(
  transactions: RawTransaction[],
  walletSlugs: string[],
  defaultWallet = 'generale',
): Record<string, number> {
  const balances: Record<string, number> = {}
  walletSlugs.forEach(slug => { balances[slug] = 0 })

  transactions.forEach(t => {
    const parsed = parseTransaction(t, defaultWallet)
    const effect = getTransactionEffect(t, defaultWallet)
    if (balances[parsed.wallet] === undefined) balances[parsed.wallet] = 0
    balances[parsed.wallet] += effect.income - effect.expense
  })

  return balances
}
