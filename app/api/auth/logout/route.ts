import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/lib/auth/session'

export async function POST(_request: NextRequest) {
  await logout()
  return NextResponse.json({ ok: true })
}
