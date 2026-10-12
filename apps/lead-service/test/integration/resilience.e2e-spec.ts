import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { LeadAttrs, UserAttrs } from '@lead/persistence';
import { Model } from 'mongoose';
import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

describe('Redis outage resilience', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let users: Model<UserAttrs>;
  let salesA: string;
  let tokenA: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'resilience-a@example.com' });
    tokenA = await running.login('resilience-a@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('keeps every endpoint correct while Redis is down and reports redis as down (TC-14)', async () => {
    const leadId = await running.insertLead({
      userId: salesA,
      fullName: 'Resilient Customer',
      updatedAt: new Date(Date.now() - 3_600_000)
    });
    await running.stopRedis();

    const list = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).toContain(leadId);

    const search = await request(app.getHttpServer())
      .get('/api/v1/leads/search?q=Resilient')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(search.body.items.map((item: { id: string }) => item.id)).toEqual([leadId]);

    const details = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(details.body.hasView).toBe(true);

    await request(app.getHttpServer())
      .put(`/api/v1/leads/${leadId}/label`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ label: 'POTENTIAL' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/activities`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Written during outage' })
      .expect(201);
    expect((await leads.findById(leadId).lean())?.label).toBe('POTENTIAL');

    const health = await request(app.getHttpServer()).get('/api/v1/health');
    expect(health.body.redis).toBe('down');
    expect(health.body.status).toBe('degraded');
  });

  it('resumes caching once Redis is back (TC-14)', async () => {
    await running.startRedis();

    const health = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(health.body.redis).toBe('up');

    const first = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(second.body).toEqual(first.body);
  });
});
