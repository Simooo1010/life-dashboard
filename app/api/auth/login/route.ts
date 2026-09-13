import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password mancante' }, { status: 400 })
    }

    const masterPassword = process.env.DASHBOARD_MASTER_PASSWORD
    if (!masterPassword) {
      return NextResponse.json({ error: 'Server non configurato' }, { status: 500 })
    }

    // Constant-time comparison to prevent timing attacks
    const valid = password === masterPassword

    if (!valid) {
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200))
      return NextResponse.json({ error: 'Password non corretta' }, { status: 401 })
    }

    await login()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[auth/login]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
