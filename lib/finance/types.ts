// Normalized, tracker-schema-agnostic shape consumed by the dashboard UI and
// the AI insight generator. Nothing outside lib/finance/ should import the
// tracker's raw row shapes (see raw-types.ts) — this boundary is what lets
// the tracker evolve independently without rebuilding the dashboard.

export interface NormalizedTransaction {
  id: string
  date: string          // ISO timestamp
  title: string          // human-readable, wallet-tag/debt-JSON stripped
  amount: number          // always positive
  type: 'income' | 'expense'
  walletSlug: string
  walletName: string
  isTransfer: boolean
  isDebt: boolean
  debt?: {
    type: 'to_me' | 'by_me'
    person: string
    desc: string
    status: 'active' | 'completed'
  }
}

export interface WalletBalance {
  slug: string
  name: string
  description: string | null
  balance: number
}

export interface FinancePeriodStats {
  income: number
  expense: number
  net: number
  savingsRate: number | null   // null when there was no income to compute a rate from
  transactionCount: number
}

export interface DebtItem {
  person: string
  desc: string
  amount: number
  type: 'to_me' | 'by_me'
}

export interface DebtsSummary {
  totalCredits: number   // active money owed TO the user
  totalDebts: number     // active money owed BY the user
  items: DebtItem[]
}

export interface FinanceSnapshot {
  totalBalance: number
  wallets: WalletBalance[]
  recentTransactions: NormalizedTransaction[]
  last7Days: FinancePeriodStats
  last30Days: FinancePeriodStats
  debts: DebtsSummary
  fetchedAt: string
}
