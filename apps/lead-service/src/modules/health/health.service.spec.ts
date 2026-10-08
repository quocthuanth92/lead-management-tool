import Redis from 'ioredis';
import mongoose from 'mongoose';

import { HealthService } from './health.service';

describe('HealthService', () => {
  const originalConnection = mongoose.connection;

  afterEach(() => {
    Object.defineProperty(mongoose, 'connection', {
      value: originalConnection,
      configurable: true
    });
  });

  it('returns ok when db and redis are up', async () => {
    Object.defineProperty(mongoose, 'connection', {
      value: { readyState: 1 },
      configurable: true
    });

    const redisMock = {
      status: 'ready',
      connect: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG')
    } as unknown as Redis;
    const service = new HealthService(redisMock);

    await expect(service.getHealth()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      redis: 'up'
    });
  });
});
