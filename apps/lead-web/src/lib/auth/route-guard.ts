export type RouteGuardDecision = { action: 'next' } | { action: 'redirect'; location: string };

const PROTECTED_PREFIXES = ['/leads'] as const;
const DEFAULT_AUTHENTICATED_PATH = '/leads';

const NEXT: RouteGuardDecision = { action: 'next' };

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveRouteGuard(
  pathname: string,
  search: string,
  hasSession: boolean
): RouteGuardDecision {
  if (pathname === '/') {
    return { action: 'redirect', location: DEFAULT_AUTHENTICATED_PATH };
  }
  if (pathname.startsWith('/api/')) {
    return NEXT;
  }
  if (isProtectedPath(pathname) && !hasSession) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return { action: 'redirect', location: `/login?next=${next}` };
  }
  return NEXT;
}

const INTERNAL_PATH_PATTERN = /^\/(?!\/|\\)[^\s]*$/;

export function sanitizeInternalPath(raw: string | undefined, fallback: string): string {
  if (!raw || raw.length > 2048 || !INTERNAL_PATH_PATTERN.test(raw) || raw.startsWith('/api/')) {
    return fallback;
  }
  return raw;
}
