import type { Route } from 'next';

// Typed routes cannot express hrefs built at runtime (query strings, sanitized paths).
// Callers must validate the path before passing it here.
export function toRoute(href: string): Route {
  return href as Route;
}
