const DEFAULT_SESSION_COOKIE_NAME = 'lead_session';

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
}

export function getUserCookieName(): string {
  return `${getSessionCookieName()}_user`;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    path: '/'
  };
}

export function expiredSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}
