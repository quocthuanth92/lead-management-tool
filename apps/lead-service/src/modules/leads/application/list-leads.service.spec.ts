import { BadRequestException } from '@nestjs/common';

import { LeadCachePort } from '../domain/ports/lead-cache.port';
import { LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { LeadSearchIndexPort } from '../domain/ports/lead-search-index.port';
import { ClockPort } from '../domain/ports/clock.port';
import { ListLeadsService } from './list-leads.service';

const NOW = new Date('2026-10-12T09:00:00.000Z');
const USER_ID = '65a000000000000000000001';

function summary(id: string) {
  return {
    id,
    customerName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '15555550100',
    label: 'UNLABELED' as const,
    hasView: false,
    lastUpdate: new Date('2026-10-01T00:00:00.000Z')
  };
}

describe('ListLeadsService', () => {
  let repository: jest.Mocked<LeadRepositoryPort>;
  let cache: jest.Mocked<LeadCachePort>;
  let index: jest.Mocked<LeadSearchIndexPort>;
  let clock: ClockPort;
  let service: ListLeadsService;

  beforeEach(() => {
    repository = {
      findOwnedById: jest.fn(),
      markRead: jest.fn(),
      setLabel: jest.fn(),
      touch: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [summary('lead-1')], total: 1 }),
      listAllForIndex: jest.fn().mockResolvedValue([])
    };
    cache = {
      getVersion: jest.fn().mockResolvedValue(3),
      getList: jest.fn().mockResolvedValue(null),
      setList: jest.fn().mockResolvedValue(undefined),
      getLead: jest.fn(),
      setLead: jest.fn(),
      invalidateLead: jest.fn(),
      invalidateUserLists: jest.fn()
    };
    index = { search: jest.fn().mockResolvedValue(null) };
    clock = { now: () => NOW };
    service = new ListLeadsService(repository, cache, index, clock);
  });

  describe('inbox', () => {
    it('lists only the caller with the default six-month range, page 1, and limit 20', async () => {
      const result = await service.inbox(USER_ID, {});

      expect(index.search).toHaveBeenCalledWith(
        USER_ID,
        3,
        expect.objectContaining({
          range: { from: new Date('2026-04-12T09:00:00.000Z'), to: NOW },
          page: 1,
          limit: 20
        }),
        expect.any(Function)
      );
      expect(repository.list).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ page: 1 }));
      expect(result).toEqual({
        items: [{ ...summary('lead-1'), lastUpdate: '2026-10-01T00:00:00.000Z' }],
        page: 1,
        limit: 20,
        total: 1
      });
    });

    it('rejects a limit above 200', async () => {
      await expect(service.inbox(USER_ID, { limit: 500 })).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('serves a cache hit without touching the index or repository', async () => {
      const cached = { items: [], page: 1, limit: 20, total: 0 };
      cache.getList.mockResolvedValueOnce(cached);

      await expect(service.inbox(USER_ID, {})).resolves.toBe(cached);
      expect(index.search).not.toHaveBeenCalled();
      expect(repository.list).not.toHaveBeenCalled();
    });

    it('stores a miss in the cache under the current version', async () => {
      await service.inbox(USER_ID, { page: 2, limit: 5 });

      expect(cache.setList).toHaveBeenCalledWith(
        USER_ID,
        3,
        expect.objectContaining({ mode: 'inbox', page: 2, limit: 5 }),
        expect.objectContaining({ page: 2, limit: 5, total: 1 })
      );
    });

    it('falls back to the repository when the search index is unavailable', async () => {
      index.search.mockResolvedValueOnce(null);

      const result = await service.inbox(USER_ID, {});

      expect(repository.list).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
    });
  });

  describe('search', () => {
    it('requires q or label', async () => {
      await expect(service.search(USER_ID, {})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('passes the term, label, and date range together', async () => {
      await service.search(USER_ID, {
        q: 'jane',
        label: 'POTENTIAL',
        fromDate: '2026-01-01',
        toDate: '2026-01-31'
      });

      expect(index.search).toHaveBeenCalledWith(
        USER_ID,
        3,
        expect.objectContaining({
          label: 'POTENTIAL',
          term: expect.objectContaining({ raw: 'jane', nameTokens: ['jane'] }),
          range: {
            from: new Date('2026-01-01T00:00:00.000Z'),
            to: new Date('2026-01-31T23:59:59.999Z')
          }
        }),
        expect.any(Function)
      );
    });

    it('supports a label-only filter', async () => {
      await service.search(USER_ID, { label: 'SPAM' });

      expect(index.search).toHaveBeenCalledWith(
        USER_ID,
        3,
        expect.objectContaining({ label: 'SPAM', term: undefined }),
        expect.any(Function)
      );
    });

    it('keys the cache by term and label so different searches never share an entry', async () => {
      await service.search(USER_ID, { q: 'jane' });
      await service.search(USER_ID, { q: 'john' });
      await service.search(USER_ID, { q: 'jane', label: 'SPAM' });

      const keys = cache.setList.mock.calls.map((call) => JSON.stringify(call[2]));
      expect(new Set(keys).size).toBe(3);
    });

    it('returns an empty page without querying when the term cannot match anything', async () => {
      const result = await service.search(USER_ID, { q: '.*' });

      expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0 });
      expect(index.search).not.toHaveBeenCalled();
      expect(repository.list).not.toHaveBeenCalled();
    });

    it('rejects a term shorter than two characters', async () => {
      await expect(service.search(USER_ID, { q: 'a' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
