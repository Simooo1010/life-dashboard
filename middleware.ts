import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'

const SESSION_OPTIONS = {
  cookieName: 'life_dashboard_session',
  password: process.env.SESSION_PASSWORD!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
  },
}

// Public paths that don't require auth
const PUBLIC_PATHS = ['/login', '/api/auth/login']

interface DashboardSessionData {
  authenticated?: boolean
  authenticatedAt?: string
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check session
  const response = NextResponse.next()
  // @ts-ignore — iron-session can work with NextRequest cookies
  const session = await getIronSession<DashboardSessionData>(request.cookies, SESSION_OPTIONS)

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
