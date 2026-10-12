import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { LeadActivityAttrs, LeadAttrs, UserAttrs } from '@lead/persistence';
import { Model, Types } from 'mongoose';
import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

describe('Lead details API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let activities: Model<LeadActivityAttrs>;
  let users: Model<UserAttrs>;
  let salesA: string;
  let tokenA: string;
  let salesB: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    activities = app.get<Model<LeadActivityAttrs>>(getModelToken('LeadActivity'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'details-a@example.com' });
    salesB = await running.createSalesperson({ email: 'details-b@example.com' });
    tokenA = await running.login('details-a@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  function details(token: string, id: string) {
    return request(app.getHttpServer())
      .get(`/api/v1/leads/${id}`)
      .set('Authorization', `Bearer ${token}`);
  }

  it('returns full details with newest activities first, marks the lead read, and keeps lastUpdate (TC-04)', async () => {
    const now = Date.now();
    const updatedAt = new Date(now - 10 * 60 * 60 * 1000);
    const leadId = await running.insertLead({
      userId: salesA,
      fullName: 'Details Customer',
      message: 'Want a test drive',
      updatedAt
    });
    for (const [hoursAgo, content] of [
      [3, 'oldest'],
      [2, 'middle'],
      [1, 'newest']
    ] as const) {
      await activities.create({
        leadId,
        userId: salesA,
        authorName: 'Test Salesperson',
        type: 'NOTE',
        content,
        createdAt: new Date(now - hoursAgo * 60 * 60 * 1000)
      });
    }

    const response = await details(tokenA, leadId).expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: leadId,
        customerName: 'Details Customer',
        message: 'Want a test drive',
        source: 'INTERNAL',
        hasView: true,
        lastUpdate: updatedAt.toISOString(),
        activitiesTotal: 3
      })
    );
    expect(
      response.body.activities.map((activity: { content: string }) => activity.content)
    ).toEqual(['newest', 'middle', 'oldest']);

    const stored = await leads.findById(leadId).lean();
    expect(stored?.hasView).toBe(true);
    expect(stored?.updatedAt.getTime()).toBe(updatedAt.getTime());

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const item = inbox.body.items.find((entry: { id: string }) => entry.id === leadId);
    expect(item.hasView).toBe(true);
  });

  it('keeps concurrent opens consistent with a single read transition (TC-04b)', async () => {
    const leadId = await running.insertLead({ userId: salesA, fullName: 'Concurrent Open' });
    const before = await leads.findById(leadId).lean();

    const [first, second] = await Promise.all([details(tokenA, leadId), details(tokenA, leadId)]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const after = await leads.findById(leadId).lean();
    expect(after?.hasView).toBe(true);
    expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
  });

  it('reports missing, malformed, and foreign leads without leaking which exists (TC-05)', async () => {
    const foreignId = await running.insertLead({ userId: salesB, fullName: 'Not Yours' });
    const missingId = new Types.ObjectId().toHexString();

    const missing = await details(tokenA, missingId).expect(404);
    const foreign = await details(tokenA, foreignId).expect(404);
    await details(tokenA, 'not-an-object-id').expect(400);

    expect(foreign.body).toEqual(missing.body);
    const stored = await leads.findById(foreignId).lean();
    expect(stored?.hasView).toBe(false);
  });
});
