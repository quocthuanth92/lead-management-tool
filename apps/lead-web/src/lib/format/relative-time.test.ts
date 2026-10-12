import { formatRelativeTime } from './relative-time';

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-12T12:00:00.000Z');

  it('shows "just now" for less than a minute', () => {
    expect(formatRelativeTime('2026-10-12T11:59:30.000Z', now)).toBe('just now');
  });

  it.each([
    ['2026-10-12T11:57:00.000Z', '3m ago'],
    ['2026-10-12T10:00:00.000Z', '2h ago'],
    ['2026-10-10T12:00:00.000Z', '2d ago'],
    ['2026-08-12T12:00:00.000Z', '2mo ago'],
    ['2024-10-12T12:00:00.000Z', '2y ago']
  ])('formats %s as %s', (value, expected) => {
    expect(formatRelativeTime(value, now)).toBe(expected);
  });

  it('returns an empty string for an invalid timestamp', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
