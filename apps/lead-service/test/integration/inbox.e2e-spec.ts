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

describe('Lead inbox API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let users: Model<UserAttrs>;
  let salesA: string;
  let tokenA: string;
  let salesB: string;
  let tokenB: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'inbox-a@example.com' });
    salesB = await running.createSalesperson({ email: 'inbox-b@example.com' });
    tokenA = await running.login('inbox-a@example.com', 'test-password');
    tokenB = await running.login('inbox-b@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  function inbox(token: string, query = '') {
    return request(app.getHttpServer())
      .get(`/api/v1/leads${query}`)
      .set('Authorization', `Bearer ${token}`);
  }

  async function countFor(userId: string, from: Date, to: Date): Promise<number> {
    return leads.countDocuments({ userId, updatedAt: { $gte: from, $lte: to } });
  }

  it('returns only the last six months by default with pagination and no duplicates (TC-01)', async () => {
    const now = Date.now();
    for (let index = 0; index < 22; index += 1) {
      await running.insertLead({
        userId: salesA,
        fullName: `Recent ${index}`,
        updatedAt: new Date(now - (index + 1) * DAY_MS)
      });
    }
    for (let index = 0; index < 3; index += 1) {
      await running.insertLead({
        userId: salesA,
        fullName: `Ancient ${index}`,
        updatedAt: new Date(now - 200 * DAY_MS)
      });
    }

    const expectedTotal = await countFor(
      salesA,
      new Date(now - 182 * DAY_MS),
      new Date(now + 60_000)
    );
    const first = await inbox(tokenA, '?page=1&limit=20').expect(200);
    const second = await inbox(tokenA, '?page=2&limit=20').expect(200);

    expect(first.body.total).toBe(expectedTotal);
    expect(first.body.items).toHaveLength(20);
    expect(second.body.items).toHaveLength(expectedTotal - 20);
    const ids = [...first.body.items, ...second.body.items].map((item: { id: string }) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      first.body.items.every(
        (item: { customerName: string }) => !item.customerName.startsWith('Ancient')
      )
    ).toBe(true);
  });

  it('lists unread leads before read ones, each group newest first (TC-01b)', async () => {
    const now = Date.now();
    await running.insertLead({
      userId: salesA,
      fullName: 'Unread older',
      hasView: false,
      updatedAt: new Date(now - 3 * DAY_MS)
    });
    await running.insertLead({
      userId: salesA,
      fullName: 'Read newest',
      hasView: true,
      updatedAt: new Date(now - 1000)
    });
    await running.insertLead({
      userId: salesA,
      fullName: 'Unread newest',
      hasView: false,
      updatedAt: new Date(now - 1000)
    });

    const response = await inbox(tokenA, '?limit=200').expect(200);
    const items = response.body.items as Array<{ hasView: boolean; lastUpdate: string }>;
    const firstRead = items.findIndex((item) => item.hasView);
    expect(firstRead).toBeGreaterThan(0);
    expect(items.slice(0, firstRead).every((item) => !item.hasView)).toBe(true);
    expect(items.slice(firstRead).every((item) => item.hasView)).toBe(true);
    for (const group of [items.slice(0, firstRead), items.slice(firstRead)]) {
      const times = group.map((item) => Date.parse(item.lastUpdate));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    }
  });

  it('narrows by an explicit range and rejects invalid query parameters (TC-02)', async () => {
    const now = Date.now();
    const from = new Date(now - DAY_MS).toISOString();
    const to = new Date(now).toISOString();
    const expected = await countFor(salesA, new Date(from), new Date(to));

    const narrow = await inbox(tokenA, `?fromDate=${from}&toDate=${to}&limit=200`).expect(200);

    expect(narrow.body.total).toBe(expected);
    for (const item of narrow.body.items) {
      const time = Date.parse(item.lastUpdate);
      expect(time).toBeGreaterThanOrEqual(Date.parse(from));
      expect(time).toBeLessThanOrEqual(Date.parse(to));
    }

    await inbox(tokenA, '?limit=500').expect(400);
    await inbox(tokenA, '?fromDate=2026-03-01&toDate=2026-01-01').expect(400);
    const garbage = await inbox(tokenA, '?fromDate=not-a-date').expect(400);
    expect(garbage.body).toEqual(
      expect.objectContaining({ statusCode: 400, error: expect.any(String) })
    );
    expect(garbage.body.message).toBeDefined();
  });

  it('never exposes another salesperson or held leads and returns the exact item shape (TC-03)', async () => {
    await running.insertLead({ userId: salesB, fullName: 'Foreign Lead', updatedAt: new Date() });
    await running.insertLead({ fullName: 'Held Lead', updatedAt: new Date() });

    const listA = await inbox(tokenA, '?limit=200').expect(200);
    const listB = await inbox(tokenB, '?limit=200').expect(200);

    const namesA = listA.body.items.map((item: { customerName: string }) => item.customerName);
    expect(namesA).not.toContain('Foreign Lead');
    expect(namesA).not.toContain('Held Lead');
    expect(listB.body.items.map((item: { customerName: string }) => item.customerName)).toContain(
      'Foreign Lead'
    );
    expect(
      listB.body.items.map((item: { customerName: string }) => item.customerName)
    ).not.toContain('Held Lead');
    expect(Object.keys(listA.body.items[0]).sort()).toEqual(
      ['customerName', 'email', 'hasView', 'id', 'label', 'lastUpdate', 'phone'].sort()
    );
    await request(app.getHttpServer()).get('/api/v1/leads').expect(401);
  });
});
