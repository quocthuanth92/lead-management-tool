import { matchProxyRoute } from './proxy-allowlist';

const OBJECT_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

describe('matchProxyRoute', () => {
  it.each([
    ['GET', ['leads']],
    ['GET', ['leads', 'search']],
    ['GET', ['leads', OBJECT_ID]],
    ['PUT', ['leads', OBJECT_ID, 'label']],
    ['GET', ['leads', OBJECT_ID, 'activities']],
    ['POST', ['leads', OBJECT_ID, 'activities']]
  ])('allows %s /%s', (method, segments) => {
    expect(matchProxyRoute(method, segments)).toBe('allowed');
  });

  it('is case-insensitive about the method', () => {
    expect(matchProxyRoute('get', ['leads'])).toBe('allowed');
  });

  it('returns not-found for paths outside the allowlist', () => {
    expect(matchProxyRoute('GET', ['auth', 'login'])).toBe('not-found');
    expect(matchProxyRoute('GET', ['leads', 'not-an-object-id'])).toBe('not-found');
    expect(matchProxyRoute('GET', [])).toBe('not-found');
  });

  it('returns not-found for traversal and separator segments', () => {
    expect(matchProxyRoute('GET', ['leads', '..'])).toBe('not-found');
    expect(matchProxyRoute('GET', ['leads', '.'])).toBe('not-found');
    expect(matchProxyRoute('GET', ['leads', 'a/b'])).toBe('not-found');
    expect(matchProxyRoute('GET', ['leads', 'a\\b'])).toBe('not-found');
    expect(matchProxyRoute('GET', ['leads', '%2e%2e'])).toBe('not-found');
    expect(matchProxyRoute('GET', ['leads', ''])).toBe('not-found');
  });

  it('returns method-not-allowed for known paths with other verbs', () => {
    expect(matchProxyRoute('POST', ['leads'])).toBe('method-not-allowed');
    expect(matchProxyRoute('PUT', ['leads', OBJECT_ID])).toBe('method-not-allowed');
    expect(matchProxyRoute('DELETE', ['leads', OBJECT_ID, 'activities'])).toBe(
      'method-not-allowed'
    );
  });
});
