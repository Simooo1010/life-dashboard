// Shape of rows as stored by the Personal Finance Tracker (hopeful-salk) in its
// own Supabase project. This is the only place that knows about the tracker's
// internal schema — everything downstream consumes the normalized types in
// ./types.ts instead, so a future tracker schema change only touches this file
// and lib/finance/snapshot.ts.

export interface RawTransaction {
  id: string
  created_at: string
  title: string
  amount: number
  type: 'income' | 'expense'
  user_id?: string
}

export interface RawWallet {
  id: string
  user_id: string
  slug: string
  name: string
  description: string | null
  position: number
  created_at: string
}
