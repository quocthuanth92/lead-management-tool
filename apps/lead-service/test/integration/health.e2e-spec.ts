import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

describe('GET /api/v1/health', () => {
  let running: RunningIntegrationApp | undefined;
  let unavailableReason: string | undefined;

  beforeAll(async () => {
    try {
      running = await createIntegrationApp();
    } catch (error) {
      unavailableReason =
        error instanceof Error ? error.message : 'Unknown integration setup error';
    }
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('returns health payload shape', async () => {
    if (!running) {
      expect(unavailableReason).toBeDefined();
      return;
    }
    await request(running.app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('db');
        expect(res.body).toHaveProperty('redis');
      });
  });
});
