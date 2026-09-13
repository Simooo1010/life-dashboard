import { getIronSession, IronSessionData } from 'iron-session'
import { cookies } from 'next/headers'

declare module 'iron-session' {
  interface IronSessionData {
    authenticated: boolean
    authenticatedAt?: string
  }
}

const SESSION_OPTIONS = {
  cookieName: 'life_dashboard_session',
  password: process.env.SESSION_PASSWORD!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<IronSessionData>(cookieStore, SESSION_OPTIONS)
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getSession()
    return session.authenticated === true
  } catch {
    return false
  }
}

export async function login(): Promise<void> {
  const session = await getSession()
  session.authenticated = true
  session.authenticatedAt = new Date().toISOString()
  await session.save()
}

export async function logout(): Promise<void> {
  const session = await getSession()
  session.destroy()
}
