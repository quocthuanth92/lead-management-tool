import { ConfigService } from '@nestjs/config';
import { leadKey, leadListKey, leadsVersionKey } from '@lead/persistence';

import { CachePort } from '../../../cache/domain/ports/cache.port';
import { RedisLeadCache } from './redis-lead.cache';

describe('RedisLeadCache', () => {
  it('uses the versioned list key and configured TTLs', async () => {
    const cache: jest.Mocked<CachePort> = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(4),
      getNumber: jest.fn().mockResolvedValue(3)
    };
    const config = { get: (_key: string, fallback: number) => fallback } as ConfigService;
    const leadCache = new RedisLeadCache(cache, config);
    const query = { page: 1, q: 'customer' };

    expect(await leadCache.getVersion('user-id')).toBe(3);
    await leadCache.setList('user-id', 3, query, { items: [] });
    expect(cache.set).toHaveBeenCalledWith(leadListKey('user-id', 3, query), { items: [] }, 60);
    const record = {
      id: 'lead-id',
      userId: 'user-id',
      customerName: 'Name',
      phone: '15555550100',
      email: null,
      message: 'Message',
      source: 'INTERNAL' as const,
      label: 'UNLABELED' as const,
      hasView: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      lastUpdate: '2026-10-01T00:00:00.000Z'
    };
    await leadCache.setLead('lead-id', record);
    expect(cache.set).toHaveBeenCalledWith(leadKey('lead-id'), record, 300);
  });

  it('invalidates lead detail and bumps only the requested user list version', async () => {
    const cache: jest.Mocked<CachePort> = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(5),
      getNumber: jest.fn().mockResolvedValue(null)
    };
    const leadCache = new RedisLeadCache(cache, {} as ConfigService);

    await leadCache.invalidateLead('lead-id');
    await leadCache.invalidateUserLists('user-id');
    expect(cache.del).toHaveBeenCalledWith(leadKey('lead-id'));
    expect(cache.incr).toHaveBeenCalledWith(leadsVersionKey('user-id'));
  });

  it('treats a missing version as zero', async () => {
    const cache = { getNumber: jest.fn().mockResolvedValue(null) } as unknown as CachePort;

    await expect(
      new RedisLeadCache(cache, {} as ConfigService).getVersion('user-id')
    ).resolves.toBe(0);
  });
});
