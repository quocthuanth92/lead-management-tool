import Redis from 'ioredis';

import { RedisCacheAdapter } from './redis-cache.adapter';

describe('RedisCacheAdapter', () => {
  const makeRedis = () =>
    ({
      status: 'ready',
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn()
    }) as unknown as Redis & {
      get: jest.Mock;
      set: jest.Mock;
      del: jest.Mock;
      incr: jest.Mock;
    };

  it('supports values, deletion, and numeric increments', async () => {
    const redis = makeRedis();
    redis.get.mockResolvedValueOnce('{"ok":true}').mockResolvedValueOnce('9');
    redis.incr.mockResolvedValue(10);
    const cache = new RedisCacheAdapter(redis);

    await expect(cache.get('cache:key')).resolves.toEqual({ ok: true });
    await cache.set('cache:key', { ok: true }, 60);
    await cache.del('cache:key');
    await expect(cache.getNumber('counter')).resolves.toBe(9);
    await expect(cache.incr('counter')).resolves.toBe(10);
    expect(redis.set).toHaveBeenCalledWith('cache:key', '{"ok":true}', 'EX', 60);
  });

  it('logs only the cache key and tolerates Redis failures', async () => {
    const redis = makeRedis();
    redis.get.mockRejectedValue(new Error('secret redis failure'));
    const cache = new RedisCacheAdapter(redis);
    const warn = jest.spyOn((cache as unknown as { logger: { warn: jest.Mock } }).logger, 'warn');

    await expect(cache.get('leads:user:version')).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('Redis cache read failed for key leads:user:version');
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('secret redis failure'));
  });
});
