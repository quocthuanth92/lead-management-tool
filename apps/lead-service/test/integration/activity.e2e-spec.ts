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

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Lead activities API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let activities: Model<LeadActivityAttrs>;
  let users: Model<UserAttrs>;
  let salesA: string;
  let salesB: string;
  let tokenA: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    activities = app.get<Model<LeadActivityAttrs>>(getModelToken('LeadActivity'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({
      email: 'activity-a@example.com',
      fullName: 'Ana Seller'
    });
    salesB = await running.createSalesperson({ email: 'activity-b@example.com' });
    tokenA = await running.login('activity-a@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  function post(id: string, body: unknown) {
    return request(app.getHttpServer())
      .post(`/api/v1/leads/${id}/activities`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send(body as object);
  }

  it('appends a note, persists it with the author, and moves the lead up in the inbox (TC-06)', async () => {
    const now = Date.now();
    const quiet = await running.insertLead({
      userId: salesA,
      fullName: 'Quiet Lead',
      hasView: true,
      updatedAt: new Date(now - 5 * DAY_MS)
    });
    const busy = await running.insertLead({
      userId: salesA,
      fullName: 'Busy Lead',
      hasView: true,
      updatedAt: new Date(now - DAY_MS)
    });

    const created = await post(quiet, { content: 'Called customer', type: 'CALL' }).expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        leadId: quiet,
        type: 'CALL',
        content: 'Called customer',
        authorName: 'Ana Seller'
      })
    );
    const stored = await activities.findById(created.body.id).lean();
    expect(String(stored?.userId)).toBe(salesA);

    const lead = await leads.findById(quiet).lean();
    expect(lead?.updatedAt.getTime()).toBeGreaterThan(now - DAY_MS);
    const inbox = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`);
    const order = inbox.body.items.map((item: { id: string }) => item.id);
    expect(order.indexOf(quiet)).toBeLessThan(order.indexOf(busy));
  });

  it('lists notes newest first and survives later reads', async () => {
    const leadId = await running.insertLead({ userId: salesA, fullName: 'Notes Lead' });
    await post(leadId, { content: 'Called customer', type: 'CALL' }).expect(201);
    await post(leadId, { content: 'Sent promotion', type: 'EMAIL' }).expect(201);

    const page = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}/activities`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(page.body.items.map((item: { content: string }) => item.content)).toEqual([
      'Sent promotion',
      'Called customer'
    ]);
    expect(page.body.total).toBe(2);
  });

  it.each([
    ['empty content', { content: '' }],
    ['whitespace-only content', { content: '    ' }],
    ['content over 2000 characters', { content: 'x'.repeat(2001) }],
    ['unknown type', { content: 'Ok', type: 'FAX' }],
    ['extra property', { content: 'Ok', author: 'someone else' }]
  ])('rejects %s without persisting anything (TC-07)', async (_label, body) => {
    const leadId = await running.insertLead({ userId: salesA, fullName: 'Validation Lead' });
    const before = await activities.countDocuments({ leadId });

    await post(leadId, body).expect(400);

    expect(await activities.countDocuments({ leadId })).toBe(before);
  });

  it('exposes no edit or delete route for activities (TC-07b)', async () => {
    const leadId = await running.insertLead({ userId: salesA, fullName: 'Append Only Lead' });
    const activityId = new Types.ObjectId().toHexString();
    await post(leadId, { content: 'Immutable note' }).expect(201);

    const attempts: Array<() => request.Test> = [
      () =>
        request(app.getHttpServer())
          .put(`/api/v1/leads/${leadId}/activities`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ content: 'changed' }),
      () =>
        request(app.getHttpServer())
          .patch(`/api/v1/leads/${leadId}/activities`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ content: 'changed' }),
      () =>
        request(app.getHttpServer())
          .delete(`/api/v1/leads/${leadId}/activities`)
          .set('Authorization', `Bearer ${tokenA}`),
      () =>
        request(app.getHttpServer())
          .delete(`/api/v1/leads/${leadId}/activities/${activityId}`)
          .set('Authorization', `Bearer ${tokenA}`)
    ];
    for (const attempt of attempts) {
      const response = await attempt();
      expect([404, 405]).toContain(response.status);
    }
    expect(await activities.countDocuments({ leadId, content: 'changed' })).toBe(0);
  });

  it('returns NotFound when adding a note to another salesperson lead', async () => {
    const foreignId = await running.insertLead({ userId: salesB, fullName: 'Foreign Notes' });

    await post(foreignId, { content: 'Should not land' }).expect(404);
    expect(await activities.countDocuments({ leadId: foreignId })).toBe(0);
  });
});
