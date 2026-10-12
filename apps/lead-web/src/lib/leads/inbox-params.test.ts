import {
  defaultDateRange,
  formatDateInput,
  parseInboxParams,
  serializeInboxParams
} from './inbox-params';

const NOW = new Date(2026, 9, 12, 12, 0, 0);

describe('defaultDateRange', () => {
  it('covers the last six months up to today', () => {
    expect(defaultDateRange(NOW)).toEqual({ from: '2026-04-12', to: '2026-10-12' });
  });

  it('clamps the start day when the target month is shorter', () => {
    expect(defaultDateRange(new Date(2026, 7, 31, 9))).toEqual({
      from: '2026-02-28',
      to: '2026-08-31'
    });
  });
});

describe('formatDateInput', () => {
  it('formats a local calendar date as YYYY-MM-DD', () => {
    expect(formatDateInput(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('parseInboxParams', () => {
  it('defaults to the last six months, page 1 and 20 rows', () => {
    expect(parseInboxParams(new URLSearchParams(''), NOW)).toEqual({
      q: '',
      label: '',
      from: '2026-04-12',
      to: '2026-10-12',
      page: 1,
      limit: 20
    });
  });

  it('reads every supported parameter', () => {
    const params = parseInboxParams(
      new URLSearchParams('q=tran&label=SPAM&from=2026-01-01&to=2026-02-01&page=3&limit=50'),
      NOW
    );
    expect(params).toEqual({
      q: 'tran',
      label: 'SPAM',
      from: '2026-01-01',
      to: '2026-02-01',
      page: 3,
      limit: 50
    });
  });

  it('clamps limit to 200', () => {
    expect(parseInboxParams(new URLSearchParams('limit=500'), NOW).limit).toBe(200);
  });

  it('ignores invalid values', () => {
    const params = parseInboxParams(
      new URLSearchParams('limit=abc&page=-2&label=VIP&from=2026-13-01&to=2026-10-01&q=a'),
      NOW
    );
    expect(params.limit).toBe(20);
    expect(params.page).toBe(1);
    expect(params.label).toBe('');
    expect(params.from).toBe('2026-04-12');
    expect(params.to).toBe('2026-10-12');
    expect(params.q).toBe('');
  });

  it('falls back to the default range when from is after to', () => {
    const params = parseInboxParams(new URLSearchParams('from=2026-10-01&to=2026-01-01'), NOW);
    expect(params.from).toBe('2026-04-12');
    expect(params.to).toBe('2026-10-12');
  });

  it('keeps a two-character search term', () => {
    expect(parseInboxParams(new URLSearchParams('q=ab'), NOW).q).toBe('ab');
  });
});

describe('serializeInboxParams', () => {
  it('omits empty search and label and round-trips through parse', () => {
    const params = parseInboxParams(new URLSearchParams('page=2'), NOW);
    const serialized = serializeInboxParams(params);

    expect(serialized).toBe('from=2026-04-12&to=2026-10-12&page=2&limit=20');
    expect(parseInboxParams(new URLSearchParams(serialized), NOW)).toEqual(params);
  });

  it('writes q and label when set', () => {
    const serialized = serializeInboxParams({
      q: 'tran an',
      label: 'POTENTIAL',
      from: '2026-04-12',
      to: '2026-10-12',
      page: 1,
      limit: 50
    });
    expect(serialized).toBe(
      'q=tran+an&label=POTENTIAL&from=2026-04-12&to=2026-10-12&page=1&limit=50'
    );
  });
});
