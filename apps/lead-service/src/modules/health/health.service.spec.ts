import Redis from 'ioredis';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when db and redis are up', async () => {
    const redisMock = {
      status: 'ready',
      connect: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG')
    } as unknown as Redis;
    const service = new HealthService({ readyState: 1 }, redisMock);

    await expect(service.getHealth()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      redis: 'up'
    });
  });

  it('reports the database as down when its connection is not ready', async () => {
    const redisMock = {
      status: 'ready',
      connect: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG')
    } as unknown as Redis;
    const service = new HealthService({ readyState: 0 }, redisMock);

    await expect(service.getHealth()).resolves.toEqual({
      status: 'down',
      db: 'down',
      redis: 'up'
    });
  });
});
