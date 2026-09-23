import { NextResponse } from 'next/server'
import { getSyncHistory } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getSyncHistory(40))
}
