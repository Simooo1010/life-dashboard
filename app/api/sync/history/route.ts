import { NextResponse } from 'next/server'
import { getRecentSyncLogs } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'

export async function GET() {
  const entries = await getRecentSyncLogs(40)
  return NextResponse.json({ entries })
}
