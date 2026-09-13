import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { RawTransaction, RawWallet } from './raw-types'

// ─── Personal Finance Tracker — read-only Supabase link ───────────────────────
// The tracker (hopeful-salk) exposes no API for structured data and has no
// MCP server; all of its own UI reads/writes go straight through Supabase
// (PostgREST) with row-level security scoped to auth.uid(). Rather than
// building a parallel finance backend or scraping its UI, the dashboard talks
// to the same Supabase project directly, the same way the tracker itself
// does — via a server-only service-role key (bypasses RLS) plus an explicit
// FINANCE_USER_ID so every query stays scoped to one user regardless of RLS.
// This key must never be exposed to the browser.

export function isFinanceConfigured(): boolean {
  return Boolean(
    process.env.FINANCE_SUPABASE_URL &&
    process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY &&
    process.env.FINANCE_USER_ID,
  )
}

let client: SupabaseClient | null = null

function getFinanceClient(): SupabaseClient {
  if (client) return client
  const url = process.env.FINANCE_SUPABASE_URL
  const key = process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('[Finance] FINANCE_SUPABASE_URL / FINANCE_SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}

function getFinanceUserId(): string {
  const userId = process.env.FINANCE_USER_ID
  if (!userId) throw new Error('[Finance] FINANCE_USER_ID not configured')
  return userId
}

export async function fetchRawWallets(): Promise<RawWallet[]> {
  const supabase = getFinanceClient()
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', getFinanceUserId())
    .order('position', { ascending: true })

  if (error) throw new Error(`[Finance] wallets fetch failed: ${error.message}`)
  return data ?? []
}

export async function fetchRawTransactions(): Promise<RawTransaction[]> {
  const supabase = getFinanceClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', getFinanceUserId())
    .order('created_at', { ascending: false })

  if (error) throw new Error(`[Finance] transactions fetch failed: ${error.message}`)
  return data ?? []
}
