import { NextResponse } from 'next/server';
import type { LoginResponse } from '@lead/shared-contracts';
import { API_PREFIX } from '@lead/shared-contracts';
import { z } from 'zod';

import {
  getSessionCookieName,
  getUserCookieName,
  sessionCookieOptions
} from '../../../../lib/auth/session-config';
import { jsonError } from '../../../../lib/server/json-error';
import { getLeadServiceUrl } from '../../../../lib/server/session';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256)
});

const UPSTREAM_TIMEOUT_MS = 10_000;

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<LoginResponse>;
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.user === 'object' &&
    candidate.user !== null
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, 'Email and password are required', 'Bad Request');
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(400, 'Email and password are required', 'Bad Request');
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getLeadServiceUrl()}/${API_PREFIX}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch {
    return jsonError(502, 'Lead service is unavailable', 'Bad Gateway');
  }

  const upstreamBody: unknown = await upstream.json().catch(() => undefined);

  if (!upstream.ok) {
    if (
      typeof upstreamBody === 'object' &&
      upstreamBody !== null &&
      'statusCode' in upstreamBody &&
      'message' in upstreamBody
    ) {
      return NextResponse.json(upstreamBody, {
        status: upstream.status,
        headers: { 'cache-control': 'no-store' }
      });
    }
    return jsonError(upstream.status, 'Sign in failed', 'Error');
  }

  if (!isLoginResponse(upstreamBody)) {
    return jsonError(502, 'Unexpected response from lead service', 'Bad Gateway');
  }

  const response = NextResponse.json(
    { user: upstreamBody.user },
    { headers: { 'cache-control': 'no-store' } }
  );
  response.cookies.set(getSessionCookieName(), upstreamBody.accessToken, sessionCookieOptions());
  const profile = {
    fullName: upstreamBody.user.fullName,
    email: upstreamBody.user.email
  };
  response.cookies.set(
    getUserCookieName(),
    encodeURIComponent(JSON.stringify(profile)),
    sessionCookieOptions()
  );
  return response;
}
