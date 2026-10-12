/** @jest-environment node */
import { NextRequest } from 'next/server';

import { __setCookies } from '../../../test/mocks/next-headers';
import { POST as login } from './login/route';
import { POST as logout } from './logout/route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

const loginResponse = {
  accessToken: 'jwt-token-value',
  user: { id: 'u1', email: 'sales.a@example.com', fullName: 'Ava Nguyen', role: 'SALESPERSON' }
};

beforeEach(() => {
  process.env.LEAD_SERVICE_URL = 'http://lead-service.test';
  delete process.env.SESSION_COOKIE_SECURE;
  fetchMock = jest.fn(
    async () =>
      new Response(JSON.stringify(loginResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  __setCookies({});
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('POST /api/auth/login', () => {
  it('sets an httpOnly SameSite=Lax session cookie and never returns the token in the body', async () => {
    const response = await login(
      jsonRequest('/api/auth/login', { email: 'sales.a@example.com', password: 'secret-pass' })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ user: loginResponse.user });
    expect(JSON.stringify(body)).not.toContain('jwt-token-value');

    const sessionCookie =
      response.headers.getSetCookie().find((cookie) => cookie.startsWith('lead_session=')) ?? '';
    expect(sessionCookie).toContain('lead_session=jwt-token-value');
    expect(sessionCookie.toLowerCase()).toContain('httponly');
    expect(sessionCookie.toLowerCase()).toContain('samesite=lax');
    expect(sessionCookie).toContain('Path=/');
    expect(sessionCookie.toLowerCase()).not.toContain('secure');
  });

  it('adds the Secure flag when SESSION_COOKIE_SECURE is true', async () => {
    process.env.SESSION_COOKIE_SECURE = 'true';
    const response = await login(
      jsonRequest('/api/auth/login', { email: 'sales.a@example.com', password: 'secret-pass' })
    );

    const sessionCookie =
      response.headers.getSetCookie().find((cookie) => cookie.startsWith('lead_session=')) ?? '';
    expect(sessionCookie.toLowerCase()).toContain('secure');
  });

  it('forwards the credentials to the lead service auth route', async () => {
    await login(
      jsonRequest('/api/auth/login', { email: ' sales.a@example.com ', password: 'secret-pass' })
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, { body?: BodyInit | null }];
    expect(url).toBe('http://lead-service.test/api/v1/auth/login');
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'sales.a@example.com',
      password: 'secret-pass'
    });
  });

  it('returns 400 for invalid payloads without calling the upstream', async () => {
    const response = await login(jsonRequest('/api/auth/login', { email: 'not-an-email' }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes the upstream error shape through and sets no cookie on failure', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: 'Invalid email or password',
          error: 'Unauthorized'
        }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    );

    const response = await login(
      jsonRequest('/api/auth/login', { email: 'sales.a@example.com', password: 'wrong-pass' })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized'
    });
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session and profile cookies', async () => {
    const response = await logout();

    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie();
    expect(
      cookies.some((cookie) => cookie.startsWith('lead_session=;') && cookie.includes('Max-Age=0'))
    ).toBe(true);
    expect(
      cookies.some(
        (cookie) => cookie.startsWith('lead_session_user=;') && cookie.includes('Max-Age=0')
      )
    ).toBe(true);
  });
});
