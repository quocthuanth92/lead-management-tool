import {
  DEFAULT_RANGE_MONTHS,
  LEAD_LABELS,
  LIMITS,
  PAGINATION,
  type LeadLabel
} from '@lead/shared-contracts';

export const ROWS_PER_PAGE_OPTIONS = [20, 50, 100, 200] as const;

export interface InboxParams {
  q: string;
  label: LeadLabel | '';
  from: string;
  to: string;
  page: number;
  limit: number;
}

export interface DateRange {
  from: string;
  to: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return formatDateInput(date) === value ? date : null;
}

export function isValidDateRange(range: DateRange): boolean {
  const from = parseDateInput(range.from);
  const to = parseDateInput(range.to);
  return from !== null && to !== null && from.getTime() <= to.getTime();
}

function subtractMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function defaultDateRange(now: Date = new Date()): DateRange {
  return {
    from: formatDateInput(subtractMonths(now, DEFAULT_RANGE_MONTHS)),
    to: formatDateInput(now)
  };
}

function parseIntegerParam(raw: string | null, fallback: number, max?: number): number {
  const value = Number(raw);
  if (raw === null || !Number.isInteger(value) || value < 1) {
    return fallback;
  }
  return max === undefined ? value : Math.min(value, max);
}

function parseSearchTerm(raw: string | null): string {
  const term = (raw ?? '').trim().slice(0, LIMITS.SEARCH_MAX);
  return term.length === 0 || term.length >= LIMITS.SEARCH_MIN ? term : '';
}

function parseLabel(raw: string | null): LeadLabel | '' {
  return LEAD_LABELS.find((label) => label === raw) ?? '';
}

export function parseInboxParams(search: URLSearchParams, now: Date = new Date()): InboxParams {
  const defaults = defaultDateRange(now);
  const requestedRange: DateRange = {
    from: search.get('from') ?? '',
    to: search.get('to') ?? ''
  };
  const range = isValidDateRange(requestedRange) ? requestedRange : defaults;

  return {
    q: parseSearchTerm(search.get('q')),
    label: parseLabel(search.get('label')),
    from: range.from,
    to: range.to,
    page: parseIntegerParam(search.get('page'), PAGINATION.DEFAULT_PAGE),
    limit: parseIntegerParam(search.get('limit'), PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT)
  };
}

export function serializeInboxParams(params: InboxParams): string {
  const search = new URLSearchParams();
  if (params.q) {
    search.set('q', params.q);
  }
  if (params.label) {
    search.set('label', params.label);
  }
  search.set('from', params.from);
  search.set('to', params.to);
  search.set('page', String(params.page));
  search.set('limit', String(params.limit));
  return search.toString();
}
