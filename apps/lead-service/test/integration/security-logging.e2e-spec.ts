import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UserAttrs } from '@lead/persistence';
import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

const API_KEY = 'this-is-a-test-api-key-thirty-two-chars';
const PROBE = {
  fullName: 'Privacy Probe Customer',
  phone: '15550007777',
  email: 'privacy.probe@example.com',
  message: 'Confidential probe message',
  note: 'Private probe note'
};

describe('Logging hygiene and request security', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let users: Model<UserAttrs>;
  let salesA: string;
  let tokenA: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'security-a@example.com' });
    tokenA = await running.login('security-a@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('never logs customer contact details or note content (TC-18, FR-033)', async () => {
    const logSpies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) =>
      jest.spyOn(Logger.prototype, level).mockImplementation()
    );
    try {
      const created = await request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('x-api-key', API_KEY)
        .send({
          fullName: PROBE.fullName,
          phone: PROBE.phone,
          email: PROBE.email,
          message: PROBE.message
        })
        .expect(201);
      const leadId = await running.insertLead({
        userId: salesA,
        fullName: PROBE.fullName,
        phone: PROBE.phone,
        email: PROBE.email,
        message: PROBE.message
      });
      const headers = { Authorization: `Bearer ${tokenA}` };
      await request(app.getHttpServer()).get('/api/v1/leads?limit=200').set(headers).expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/leads/search?q=privacy')
        .set(headers)
        .expect(200);
      await request(app.getHttpServer()).get(`/api/v1/leads/${leadId}`).set(headers).expect(200);
      await request(app.getHttpServer())
        .put(`/api/v1/leads/${leadId}/label`)
        .set(headers)
        .send({ label: 'POTENTIAL' })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/leads/${leadId}/activities`)
        .set(headers)
        .send({ content: PROBE.note })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/api/v1/leads/${leadId}/activities`)
        .set(headers)
        .expect(200);
      expect(created.body.id).toBeDefined();

      const logged = logSpies.flatMap((spy) => spy.mock.calls.flat().map((value) => String(value)));
      const serialised = logged.join('\n');
      for (const secret of [PROBE.fullName, PROBE.phone, PROBE.email, PROBE.message, PROBE.note]) {
        expect(serialised).not.toContain(secret);
      }
      expect(logged.some((line) => line.includes('Internal lead ingested id='))).toBe(true);
    } finally {
      logSpies.forEach((spy) => spy.mockRestore());
    }
  });

  it('sends the browser security headers on API responses', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects a tampered token and ignores the API key on salesperson routes (TC-15)', async () => {
    const [header, payload, signature] = tokenA.split('.');
    const tampered = `${header}.${payload}.${signature.slice(0, -2)}AA`;

    await request(app.getHttpServer())
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${tampered}`)
      .expect(401);
    await request(app.getHttpServer()).get('/api/v1/leads').set('x-api-key', API_KEY).expect(401);
  });
});
