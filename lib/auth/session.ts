import { getIronSession, IronSessionData } from 'iron-session'
import { cookies } from 'next/headers'
import { SESSION_OPTIONS } from './config'

declare module 'iron-session' {
  interface IronSessionData {
    authenticated: boolean
    authenticatedAt?: string
  }
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
