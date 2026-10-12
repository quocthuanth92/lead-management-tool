import { DEFAULT_RANGE_MONTHS } from '@lead/shared-contracts';

import { InvalidQueryError } from '../errors/invalid-query.error';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangeInput {
  fromDate?: string;
  toDate?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveDateRange(input: DateRangeInput, now: Date): DateRange {
  const to = input.toDate !== undefined ? parseBoundary(input.toDate, 'toDate') : now;
  const from =
    input.fromDate !== undefined
      ? parseBoundary(input.fromDate, 'fromDate')
      : subtractMonths(to, DEFAULT_RANGE_MONTHS);

  if (from.getTime() > to.getTime()) {
    throw new InvalidQueryError('fromDate must not be later than toDate');
  }
  return { from, to };
}

function parseBoundary(value: string, field: 'fromDate' | 'toDate'): Date {
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    const start = Date.UTC(year, month - 1, day);
    const check = new Date(start);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      throw new InvalidQueryError(`${field} is not a valid calendar date`);
    }
    return field === 'toDate' ? new Date(start + DAY_MS - 1) : new Date(start);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidQueryError(`${field} is not a valid date`);
  }
  return parsed;
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
