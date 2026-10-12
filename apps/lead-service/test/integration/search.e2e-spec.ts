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

type ExplainResult = {
  queryPlanner: { winningPlan: unknown };
  executionStats: { totalDocsExamined: number };
};

describe('Lead search API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let leads: Model<LeadAttrs>;
  let users: Model<UserAttrs>;
  let salesA: string;
  let salesB: string;
  let tokenA: string;
  let tokenB: string;
  let jane: string;
  let john: string;
  let old: string;
  let foreignJane: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    leads = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'search-a@example.com' });
    salesB = await running.createSalesperson({ email: 'search-b@example.com' });
    tokenA = await running.login('search-a@example.com', 'test-password');
    tokenB = await running.login('search-b@example.com', 'test-password');

    const now = Date.now();
    jane = await running.insertLead({
      userId: salesA,
      fullName: 'Jane Nguyễn',
      email: 'jane.nguyen@example.com',
      phone: '+1 (555) 123-4567',
      updatedAt: new Date(now - DAY_MS)
    });
    john = await running.insertLead({
      userId: salesA,
      fullName: 'John Johnson',
      email: 'john@example.com',
      phone: '15551230000',
      label: 'POTENTIAL',
      updatedAt: new Date(now - 2 * DAY_MS)
    });
    old = await running.insertLead({
      userId: salesA,
      fullName: 'Old Customer',
      email: 'old@example.com',
      phone: '15559990000',
      updatedAt: new Date(now - 200 * DAY_MS)
    });
    foreignJane = await running.insertLead({
      userId: salesB,
      fullName: 'Jane Other',
      email: 'jane.other@example.com',
      phone: '+1 (555) 123-4567',
      updatedAt: new Date(now - DAY_MS)
    });
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  function search(token: string, query: string) {
    return request(app.getHttpServer())
      .get(`/api/v1/leads/search${query}`)
      .set('Authorization', `Bearer ${token}`);
  }

  function ids(body: { items: Array<{ id: string }> }): string[] {
    return body.items.map((item) => item.id);
  }

  it('matches partial names case-insensitively and ignores diacritics (TC-09)', async () => {
    expect(ids((await search(tokenA, '?q=jan').expect(200)).body)).toEqual([jane]);
    expect(ids((await search(tokenA, '?q=NGUYEN').expect(200)).body)).toEqual([jane]);
    expect(ids((await search(tokenA, '?q=johnson').expect(200)).body)).toEqual([john]);
  });

  it('matches phone numbers regardless of formatting and respects the date range (TC-10)', async () => {
    const formatted = (await search(tokenA, '?q=%2B1%20555-123').expect(200)).body;
    expect(ids(formatted).sort()).toEqual([jane, john].sort());

    const parenthesised = (await search(tokenA, '?q=(555)%20123-4567').expect(200)).body;
    expect(ids(parenthesised)).toEqual([jane]);

    const from = new Date(Date.now() - 3 * DAY_MS).toISOString();
    const narrow = await search(tokenA, `?q=Old&fromDate=${from}`).expect(200);
    expect(narrow.body.total).toBe(0);
    const wide = await search(
      tokenA,
      `?q=Old&fromDate=${new Date(Date.now() - 365 * DAY_MS).toISOString()}`
    ).expect(200);
    expect(ids(wide.body)).toEqual([old]);
  });

  it('supports email fragments, label filters, and combinations (TC-10b)', async () => {
    expect(ids((await search(tokenA, '?q=jane.nguyen').expect(200)).body)).toEqual([jane]);
    expect(ids((await search(tokenA, '?q=john%40example').expect(200)).body)).toEqual([john]);
    expect(ids((await search(tokenA, '?label=POTENTIAL').expect(200)).body)).toEqual([john]);
    expect(ids((await search(tokenA, '?q=john&label=POTENTIAL').expect(200)).body)).toEqual([john]);
    expect((await search(tokenA, '?q=john&label=SPAM').expect(200)).body.total).toBe(0);
    await search(tokenA, '?q=a').expect(400);
    await search(tokenA, `?q=${'x'.repeat(101)}`).expect(400);
    await search(tokenA, '?').expect(400);
  });

  it('treats regex and operator characters as plain text (TC-15)', async () => {
    for (const term of ['.*', '((', '\\\\', '$where']) {
      const response = await search(tokenA, `?q=${encodeURIComponent(term)}`).expect(200);
      expect(
        response.body.items.map((item: { customerName: string }) => item.customerName)
      ).not.toContain('Jane Other');
    }
    expect((await search(tokenA, `?q=${encodeURIComponent('.*')}`).expect(200)).body.total).toBe(0);
    expect((await search(tokenA, `?q=${encodeURIComponent('((')}`).expect(200)).body.total).toBe(0);
  });

  it('never returns another salesperson leads, even with identical phone numbers', async () => {
    const response = await search(tokenA, '?q=555-123-4567').expect(200);
    expect(ids(response.body)).not.toContain(foreignJane);

    const foreign = await search(tokenB, '?q=jane').expect(200);
    expect(ids(foreign.body)).toEqual([foreignJane]);
  });

  it('orders and paginates search results exactly like the inbox', async () => {
    const now = Date.now();
    const first = await running.insertLead({
      userId: salesA,
      fullName: 'Common Match One',
      hasView: true,
      updatedAt: new Date(now - 4 * DAY_MS)
    });
    const second = await running.insertLead({
      userId: salesA,
      fullName: 'Common Match Two',
      hasView: false,
      updatedAt: new Date(now - 6 * DAY_MS)
    });
    const third = await running.insertLead({
      userId: salesA,
      fullName: 'Common Match Three',
      hasView: true,
      updatedAt: new Date(now - 2 * DAY_MS)
    });
    const common = new Set([first, second, third]);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const expected = ids(inbox.body).filter((id) => common.has(id));
    const searched = await search(tokenA, '?q=common&limit=200').expect(200);

    expect(ids(searched.body)).toEqual(expected);
    const pageOne = await search(tokenA, '?q=common&limit=2&page=1').expect(200);
    const pageTwo = await search(tokenA, '?q=common&limit=2&page=2').expect(200);
    expect([...ids(pageOne.body), ...ids(pageTwo.body)]).toEqual(expected);
  });

  it('bounds the MongoDB fallback search to the salesperson index (research R-06)', async () => {
    const plan = (await leads
      .find({
        userId: salesA,
        updatedAt: { $gte: new Date(Date.now() - 182 * DAY_MS), $lte: new Date() },
        $or: [{ fullNameSearch: { $regex: 'jane' } }]
      })
      .explain('executionStats')) as unknown as ExplainResult;

    expect(JSON.stringify(plan.queryPlanner.winningPlan)).not.toContain('COLLSCAN');
    expect(plan.executionStats.totalDocsExamined).toBeGreaterThan(0);
  });
});
