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

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Lead labeling API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let users: Model<UserAttrs>;
  let salesA: string;
  let salesB: string;
  let tokenA: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'label-a@example.com' });
    salesB = await running.createSalesperson({ email: 'label-b@example.com' });
    tokenA = await running.login('label-a@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  function setLabel(id: string, label: unknown) {
    return request(app.getHttpServer())
      .put(`/api/v1/leads/${id}/label`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ label });
  }

  it('keeps exactly one label per lead and moves lastUpdate forward (TC-08)', async () => {
    const leadId = await running.insertLead({
      userId: salesA,
      fullName: 'Labelled Lead',
      hasView: true,
      updatedAt: new Date(Date.now() - DAY_MS)
    });

    const spam = await setLabel(leadId, 'SPAM').expect(200);
    const potential = await setLabel(leadId, 'POTENTIAL').expect(200);

    expect(spam.body.label).toBe('SPAM');
    expect(potential.body.label).toBe('POTENTIAL');
    expect(Date.parse(potential.body.lastUpdate)).toBeGreaterThan(Date.parse(spam.body.lastUpdate));
    const stored = await leads.findById(leadId).lean();
    expect(stored?.label).toBe('POTENTIAL');
  });

  it('rejects an unknown label and leaves the stored label unchanged', async () => {
    const leadId = await running.insertLead({
      userId: salesA,
      fullName: 'Stable Label',
      label: 'POTENTIAL'
    });

    await setLabel(leadId, 'VIP').expect(400);
    await setLabel(leadId, 'spam').expect(400);

    expect((await leads.findById(leadId).lean())?.label).toBe('POTENTIAL');
  });

  it('returns NotFound for another salesperson lead', async () => {
    const foreignId = await running.insertLead({ userId: salesB, fullName: 'Other Seller Lead' });

    await setLabel(foreignId, 'SPAM').expect(404);
    expect((await leads.findById(foreignId).lean())?.label).toBe('UNLABELED');
  });

  it('moves the relabelled lead up within the inbox ordering', async () => {
    const now = Date.now();
    const older = await running.insertLead({
      userId: salesA,
      fullName: 'Ordering Older',
      hasView: true,
      updatedAt: new Date(now - 2 * DAY_MS)
    });
    const newer = await running.insertLead({
      userId: salesA,
      fullName: 'Ordering Newer',
      hasView: true,
      updatedAt: new Date(now - DAY_MS)
    });

    const beforeList = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(
      beforeList.body.items.findIndex((item: { id: string }) => item.id === older)
    ).toBeGreaterThan(beforeList.body.items.findIndex((item: { id: string }) => item.id === newer));

    await setLabel(older, 'POTENTIAL').expect(200);

    const afterList = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(
      afterList.body.items.findIndex((item: { id: string }) => item.id === older)
    ).toBeLessThan(afterList.body.items.findIndex((item: { id: string }) => item.id === newer));
  });
});
