import type { SessionOptions } from 'iron-session'

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
export const SESSION_COOKIE_NAME = 'life_dashboard_session'

export const SESSION_OPTIONS: SessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: process.env.SESSION_PASSWORD!,
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  },
}
