import { NextResponse } from 'next/server';

import {
  expiredSessionCookieOptions,
  getSessionCookieName,
  getUserCookieName
} from '../../../../lib/auth/session-config';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  response.cookies.set(getSessionCookieName(), '', expiredSessionCookieOptions());
  response.cookies.set(getUserCookieName(), '', expiredSessionCookieOptions());
  return response;
}
