import { resolveRouteGuard, sanitizeInternalPath } from './route-guard';

describe('resolveRouteGuard', () => {
  it('sends / to /leads', () => {
    expect(resolveRouteGuard('/', '', false)).toEqual({ action: 'redirect', location: '/leads' });
  });

  it('redirects protected pages to login when there is no session', () => {
    expect(resolveRouteGuard('/leads/abc', '?q=x', false)).toEqual({
      action: 'redirect',
      location: '/login?next=%2Fleads%2Fabc%3Fq%3Dx'
    });
  });

  it('lets protected pages through with a session', () => {
    expect(resolveRouteGuard('/leads', '', true)).toEqual({ action: 'next' });
  });

  it('never redirects API routes or the login page', () => {
    expect(resolveRouteGuard('/api/lead-service/leads', '', false)).toEqual({ action: 'next' });
    expect(resolveRouteGuard('/login', '', false)).toEqual({ action: 'next' });
  });
});

describe('sanitizeInternalPath', () => {
  it('keeps same-origin relative paths', () => {
    expect(sanitizeInternalPath('/leads?page=2', '/leads')).toBe('/leads?page=2');
  });

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'leads',
    '/api/auth/logout'
  ])('falls back for %s', (value) => {
    expect(sanitizeInternalPath(value, '/leads')).toBe('/leads');
  });

  it('falls back when missing', () => {
    expect(sanitizeInternalPath(undefined, '/leads')).toBe('/leads');
  });
});
