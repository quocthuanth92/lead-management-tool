/** @jest-environment node */
import { NextRequest } from 'next/server';

import { proxy } from './proxy';

function request(url: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    headers: cookie ? { cookie } : undefined
  });
}

describe('proxy (route guard)', () => {
  it('redirects / to /leads', () => {
    const response = proxy(request('/', 'lead_session=jwt'));

    expect(response.headers.get('location')).toBe('http://localhost:3000/leads');
  });

  it('redirects unauthenticated visits to /leads to /login with the original path as next', () => {
    const response = proxy(request('/leads?page=2&label=SPAM'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fleads%3Fpage%3D2%26label%3DSPAM'
    );
  });

  it('passes authenticated requests to protected pages through', () => {
    const response = proxy(request('/leads/65f1a2b3c4d5e6f7a8b9c0d1', 'lead_session=jwt'));

    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('does not redirect BFF API routes', () => {
    const response = proxy(request('/api/lead-service/leads'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('keeps the login page reachable without a session', () => {
    const response = proxy(request('/login'));

    expect(response.headers.get('location')).toBeNull();
  });
});
