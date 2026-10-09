import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

describe('Error contract', () => {
  let running: RunningIntegrationApp | undefined;
  let unavailableReason: string | undefined;

  beforeAll(async () => {
    running = await createIntegrationApp();
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('returns shared error shape on validation failure', async () => {
    if (!running) {
      expect(unavailableReason).toBeDefined();
      return;
    }
    await request(running.app.getHttpServer())
      .post('/api/v1/leads/placeholder')
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 400,
            message: expect.anything(),
            error: expect.any(String)
          })
        );
      });
  });

  it('returns shared error shape on not found', async () => {
    if (!running) {
      expect(unavailableReason).toBeDefined();
      return;
    }
    await request(running.app.getHttpServer())
      .get('/api/v1/not-found')
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            statusCode: 404,
            message: expect.anything(),
            error: expect.any(String)
          })
        );
      });
  });
});
