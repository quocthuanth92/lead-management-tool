import { createHash } from 'node:crypto';

import { leadKey, leadListKey, leadsVersionKey } from './cache-keys';

const sha1 = (value: string) => createHash('sha1').update(value).digest('hex');

describe('cache keys', () => {
  it('builds list keys as leads:{userId}:{version}:{sha1(query)}', () => {
    const query = { page: 1, limit: 20 };
    expect(leadListKey('u1', 3, query)).toBe(
      `leads:u1:3:${sha1(JSON.stringify({ limit: 20, page: 1 }))}`
    );
  });

  it('is identical for equal queries regardless of parameter order', () => {
    const a = { page: 1, limit: 20, filter: { label: 'SPAM', q: 'ann' } };
    const b = { filter: { q: 'ann', label: 'SPAM' }, limit: 20, page: 1 };
    expect(leadListKey('u1', 1, a)).toBe(leadListKey('u1', 1, b));
  });

  it('ignores undefined parameters', () => {
    expect(leadListKey('u1', 1, { page: 1, q: undefined })).toBe(leadListKey('u1', 1, { page: 1 }));
  });

  it('differs for different queries, users and versions', () => {
    const base = leadListKey('u1', 1, { page: 1 });
    expect(leadListKey('u1', 1, { page: 2 })).not.toBe(base);
    expect(leadListKey('u2', 1, { page: 1 })).not.toBe(base);
    expect(leadListKey('u1', 2, { page: 1 })).not.toBe(base);
  });

  it('builds lead and version keys', () => {
    expect(leadKey('abc')).toBe('lead:abc');
    expect(leadsVersionKey('u1')).toBe('leads:version:u1');
  });
});
