import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SESSION_OPTIONS } from '@/lib/auth/config'

const PUBLIC_PATHS = new Set(['/api/auth/login', '/manifest.webmanifest', '/icon', '/apple-icon'])

interface DashboardSessionData {
  authenticated?: boolean
  authenticatedAt?: string
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Installation resources and the login endpoint must be available before auth.
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  // Check session
  const response = NextResponse.next()
  // @ts-ignore — iron-session can work with NextRequest cookies
  const session = await getIronSession<DashboardSessionData>(request.cookies, SESSION_OPTIONS)

  // A Home Screen app installed while logged out may relaunch at /login.
  // Preserve the saved session by returning authenticated users to the app.
  if (pathname === '/login') {
    return session.authenticated
      ? NextResponse.redirect(new URL('/', request.url))
      : response
  }

  if (!session.authenticated) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
