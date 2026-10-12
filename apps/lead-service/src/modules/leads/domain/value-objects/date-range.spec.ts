import { InvalidQueryError } from '../errors/invalid-query.error';
import { resolveDateRange } from './date-range';

describe('resolveDateRange', () => {
  const now = new Date('2026-10-12T09:00:00.000Z');

  it('defaults to the six months before now, ending now', () => {
    expect(resolveDateRange({}, now)).toEqual({
      from: new Date('2026-04-12T09:00:00.000Z'),
      to: now
    });
  });

  it('treats a date-only toDate as inclusive to the end of that UTC day', () => {
    const range = resolveDateRange({ fromDate: '2026-01-01', toDate: '2026-01-31' }, now);

    expect(range.from).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(range.to).toEqual(new Date('2026-01-31T23:59:59.999Z'));
  });

  it('defaults fromDate to six months before an explicit toDate', () => {
    const range = resolveDateRange({ toDate: '2026-10-01T00:00:00Z' }, now);

    expect(range.from).toEqual(new Date('2026-04-01T00:00:00.000Z'));
  });

  it('defaults toDate to now when only fromDate is given', () => {
    const range = resolveDateRange({ fromDate: '2026-09-01T00:00:00.000Z' }, now);

    expect(range.to).toEqual(now);
  });

  it('clamps the six-month offset to the last day of the target month', () => {
    const range = resolveDateRange({}, new Date('2026-08-31T10:00:00.000Z'));

    expect(range.from).toEqual(new Date('2026-02-28T10:00:00.000Z'));
  });

  it('rejects fromDate later than toDate', () => {
    expect(() => resolveDateRange({ fromDate: '2026-02-01', toDate: '2026-01-01' }, now)).toThrow(
      InvalidQueryError
    );
  });

  it('rejects unparseable dates', () => {
    expect(() => resolveDateRange({ fromDate: 'not-a-date' }, now)).toThrow(InvalidQueryError);
  });

  it('rejects impossible calendar dates', () => {
    expect(() => resolveDateRange({ toDate: '2026-02-30' }, now)).toThrow(InvalidQueryError);
  });
});
