import { createClient } from '@supabase/supabase-js'

// ─── Life Dashboard Dedicated Supabase Client ─────────────────────────────────
// Used for cloud persistence / daily synthesis cache on Vercel
const dashboardUrl =
  process.env.DASHBOARD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_DASHBOARD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const dashboardKey =
  process.env.DASHBOARD_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const dashboardSupabase =
  dashboardUrl && dashboardKey ? createClient(dashboardUrl, dashboardKey) : null
