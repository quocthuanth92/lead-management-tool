import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

export function leadListKey(userId: string, version: number | string, query: unknown): string {
  const digest = createHash('sha1').update(JSON.stringify(canonicalize(query))).digest('hex');
  return `leads:${userId}:${version}:${digest}`;
}

export function leadKey(id: string): string {
  return `lead:${id}`;
}

export function leadsVersionKey(userId: string): string {
  return `leads:version:${userId}`;
}
