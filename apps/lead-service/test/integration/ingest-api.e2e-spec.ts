import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { LeadAttrs, UserAttrs } from '@lead/persistence';
import { Model } from 'mongoose';
import request from 'supertest';

import {
  RunningIntegrationApp,
  createIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

const API_KEY = 'this-is-a-test-api-key-thirty-two-chars';

describe('Internal lead ingestion API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let users: Model<UserAttrs>;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await running.createSalesperson();
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('requires the internal API key and rejects malformed bodies without persisting', async () => {
    const before = await leads.countDocuments();
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .send({ fullName: 'No key', phone: '15555551212', message: 'Hello' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', 'incorrect-api-key')
      .send({ fullName: 'Wrong key', phone: '15555551213', message: 'Hello' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', API_KEY)
      .send({ fullName: 'Bad phone', phone: '123', message: 'Hello' })
      .expect(400);
    expect(await leads.countDocuments()).toBe(before);
  });

  it('stores each valid submission unread and unlabeled and assigns in round-robin order', async () => {
    await users.deleteMany({ role: 'SALESPERSON' });
    const first = await running.createSalesperson({ email: 'one@example.com' });
    const second = await running.createSalesperson({ email: 'two@example.com' });
    const post = (phone: string) =>
      request(app.getHttpServer())
        .post('/api/v1/leads')
        .set('x-api-key', API_KEY)
        .send({ fullName: 'A Customer', phone, message: 'Interested in a vehicle' })
        .expect(201);

    const firstResponse = await post('+1 (555) 555-0001');
    const secondResponse = await post('+1 (555) 555-0002');
    const thirdResponse = await post('+1 (555) 555-0003');
    const ids = [
      firstResponse.body.id as string,
      secondResponse.body.id as string,
      thirdResponse.body.id as string
    ];
    const created = await Promise.all(ids.map((id) => leads.findById(id).lean()));

    expect(created).toHaveLength(3);
    expect(created.map((lead) => String(lead?.userId))).toEqual([first, second, first]);
    expect(created.every((lead) => lead && !lead.hasView && lead.label === 'UNLABELED')).toBe(true);
    expect(created.every((lead) => lead?.source === 'INTERNAL')).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it('creates distinct leads for repeated internal submissions', async () => {
    const body = { fullName: 'Repeated Customer', phone: '15555550005', message: 'Same request' };
    const first = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', API_KEY)
      .send(body)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', API_KEY)
      .send(body)
      .expect(201);

    expect(first.body.id).not.toBe(second.body.id);
  });

  it('stores unassigned leads when no salesperson is active', async () => {
    await users.deleteMany({ role: 'SALESPERSON' });
    const response = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', API_KEY)
      .send({ fullName: 'Held Customer', phone: '15555550004', message: 'Interested' })
      .expect(201);

    const lead = await leads.findById(response.body.id).lean();
    expect(lead?.assignmentStatus).toBe('UNASSIGNED');
    expect(lead?.userId).toBeUndefined();
  });
});
