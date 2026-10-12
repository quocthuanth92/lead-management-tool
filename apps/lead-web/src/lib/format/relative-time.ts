const SHORT_UNITS = [
  { seconds: 365 * 86_400, label: 'y' },
  { seconds: 30 * 86_400, label: 'mo' },
  { seconds: 86_400, label: 'd' },
  { seconds: 3_600, label: 'h' },
  { seconds: 60, label: 'm' }
] as const;

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }
  const elapsedSeconds = (now.getTime() - timestamp) / 1000;
  for (const unit of SHORT_UNITS) {
    if (elapsedSeconds >= unit.seconds) {
      return `${Math.floor(elapsedSeconds / unit.seconds)}${unit.label} ago`;
    }
  }
  return 'just now';
}

export function formatAbsoluteDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
