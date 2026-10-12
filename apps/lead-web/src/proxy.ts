import { NextRequest, NextResponse } from 'next/server';

import { getSessionCookieName } from './lib/auth/session-config';
import { resolveRouteGuard } from './lib/auth/route-guard';

export function proxy(request: NextRequest): NextResponse {
  const hasSession = Boolean(request.cookies.get(getSessionCookieName())?.value);
  const decision = resolveRouteGuard(request.nextUrl.pathname, request.nextUrl.search, hasSession);
  if (decision.action === 'redirect') {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
