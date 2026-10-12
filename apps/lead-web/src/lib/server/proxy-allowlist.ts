export type ProxyMethod = 'GET' | 'POST' | 'PUT';

export type ProxyRouteMatch = 'allowed' | 'method-not-allowed' | 'not-found';

const OBJECT_ID = '[a-f0-9]{24}';

const ALLOWED_ROUTES: ReadonlyArray<{ method: ProxyMethod; pattern: RegExp }> = [
  { method: 'GET', pattern: /^leads$/ },
  { method: 'GET', pattern: /^leads\/search$/ },
  { method: 'GET', pattern: new RegExp(`^leads/${OBJECT_ID}$`) },
  { method: 'PUT', pattern: new RegExp(`^leads/${OBJECT_ID}/label$`) },
  { method: 'GET', pattern: new RegExp(`^leads/${OBJECT_ID}/activities$`) },
  { method: 'POST', pattern: new RegExp(`^leads/${OBJECT_ID}/activities$`) }
];

function isUnsafeSegment(segment: string): boolean {
  return segment.length === 0 || /[/\\%]/.test(segment) || segment === '.' || segment === '..';
}

export function matchProxyRoute(method: string, segments: readonly string[]): ProxyRouteMatch {
  if (segments.length === 0 || segments.some(isUnsafeSegment)) {
    return 'not-found';
  }
  const path = segments.join('/');
  const pathMatches = ALLOWED_ROUTES.filter((route) => route.pattern.test(path));
  if (pathMatches.length === 0) {
    return 'not-found';
  }
  const normalizedMethod = method.toUpperCase();
  return pathMatches.some((route) => route.method === normalizedMethod)
    ? 'allowed'
    : 'method-not-allowed';
}
