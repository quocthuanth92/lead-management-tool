import { HealthService } from './health.service';

const pong = async (): Promise<'PONG'> => 'PONG';

describe('background health service', () => {
  it('reports ok when MongoDB and Redis are up', async () => {
    const service = new HealthService({ readyState: 1 }, { ping: pong });

    await expect(service.getHealth()).resolves.toEqual({ status: 'ok', db: 'up', redis: 'up' });
  });

  it('reports degraded with redis down when Redis fails', async () => {
    const service = new HealthService(
      { readyState: 1 },
      { ping: () => Promise.reject(new Error('ECONNREFUSED')) }
    );

    await expect(service.getHealth()).resolves.toEqual({
      status: 'degraded',
      db: 'up',
      redis: 'down'
    });
  });

  it('reports down when MongoDB is not connected', async () => {
    const service = new HealthService({ readyState: 0 }, { ping: pong });

    await expect(service.getHealth()).resolves.toEqual({ status: 'down', db: 'down', redis: 'up' });
  });
});
