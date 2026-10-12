import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UserAttrs, leadsVersionKey } from '@lead/persistence';
import {
  LEAD_REPOSITORY_PORT,
  LeadRepositoryPort
} from '../../src/modules/leads/domain/ports/lead-repository.port';
import { REDIS_CLIENT } from '../../src/core/redis/redis.module';
import Redis from 'ioredis';
import { Model } from 'mongoose';
import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

const API_KEY = 'this-is-a-test-api-key-thirty-two-chars';

describe('Lead cache behaviour', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let users: Model<UserAttrs>;
  let redis: Redis;
  let repository: LeadRepositoryPort;
  let salesA: string;
  let salesB: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    redis = app.get<Redis>(REDIS_CLIENT);
    repository = app.get<LeadRepositoryPort>(LEAD_REPOSITORY_PORT);
    await users.deleteMany({ role: 'SALESPERSON' });
    salesA = await running.createSalesperson({ email: 'cache-a@example.com' });
    salesB = await running.createSalesperson({ email: 'cache-b@example.com' });
    tokenA = await running.login('cache-a@example.com', 'test-password');
    tokenB = await running.login('cache-b@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  function inbox(token: string) {
    return request(app.getHttpServer())
      .get('/api/v1/leads?limit=200')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  }

  function spyOnDatabaseReads() {
    return {
      list: jest.spyOn(repository, 'list'),
      listAll: jest.spyOn(repository, 'listAllForIndex')
    };
  }

  it('serves a repeated inbox read from Redis without touching MongoDB (TC-13)', async () => {
    const leadId = await running.insertLead({ userId: salesA, fullName: 'Cache Probe' });
    await inbox(tokenA);
    const spies = spyOnDatabaseReads();

    const second = await inbox(tokenA);

    expect(spies.list).not.toHaveBeenCalled();
    expect(spies.listAll).not.toHaveBeenCalled();
    expect(second.body.items.map((item: { id: string }) => item.id)).toContain(leadId);
    expect((await redis.keys(`leads:${salesA}:*`)).length).toBeGreaterThan(0);
    spies.list.mockRestore();
    spies.listAll.mockRestore();
  });

  it('makes activity, label, mark-read, and ingestion visible immediately', async () => {
    const leadId = await running.insertLead({
      userId: salesA,
      fullName: 'Immediate Visibility',
      updatedAt: new Date(Date.now() - 86_400_000)
    });
    const find = (body: {
      items: Array<{ id: string; lastUpdate: string; hasView: boolean; label: string }>;
    }) => body.items.find((item) => item.id === leadId);
    expect(find((await inbox(tokenA)).body)).toMatchObject({ hasView: false, label: 'UNLABELED' });

    await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(find((await inbox(tokenA)).body)).toMatchObject({ hasView: true });

    await request(app.getHttpServer())
      .put(`/api/v1/leads/${leadId}/label`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ label: 'SPAM' })
      .expect(200);
    expect(find((await inbox(tokenA)).body)).toMatchObject({ label: 'SPAM' });

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/activities`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Fresh note' })
      .expect(201);
    const afterNote = find((await inbox(tokenA)).body);
    expect(Date.parse(afterNote?.lastUpdate ?? '')).toBeGreaterThan(Date.now() - 60_000);

    await users.updateOne({ _id: salesB }, { $set: { isActive: false } });
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', API_KEY)
      .send({ fullName: 'Ingested Lead', phone: '15550003333', message: 'Hello' })
      .expect(201);
    const ingested = await inbox(tokenA);
    expect(
      ingested.body.items.map((item: { customerName: string }) => item.customerName)
    ).toContain('Ingested Lead');
    await users.updateOne({ _id: salesB }, { $set: { isActive: true } });
  });

  it('isolates list versions per salesperson', async () => {
    await running.insertLead({ userId: salesA, fullName: 'Isolation Probe' });
    await inbox(tokenA);
    const versionBefore = await redis.get(leadsVersionKey(salesA));
    const leadB = await running.insertLead({ userId: salesB, fullName: 'Other Seller Probe' });
    await request(app.getHttpServer())
      .put(`/api/v1/leads/${leadB}/label`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ label: 'POTENTIAL' })
      .expect(200);

    const spies = spyOnDatabaseReads();
    await inbox(tokenA);

    expect(await redis.get(leadsVersionKey(salesA))).toBe(versionBefore);
    expect(spies.list).not.toHaveBeenCalled();
    expect(spies.listAll).not.toHaveBeenCalled();
    spies.list.mockRestore();
    spies.listAll.mockRestore();
  });
});
