import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import request from 'supertest';

import { UserAttrs } from '@lead/persistence';
import {
  RunningIntegrationApp,
  createIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

describe('Authentication API', () => {
  let running: RunningIntegrationApp;
  let app: INestApplication;
  let email: string;
  const password = 'integration-test-password';

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    email = `auth-${randomUUID()}@example.com`;
    await running.createSalesperson({ email, password });
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('returns a usable token and never returns a password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: { email, role: 'SALESPERSON' }
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    await request(app.getHttpServer())
      .get('/api/v1/__test/protected')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .expect(200);
  });

  it('rejects a missing, invalid, or expired bearer token even when an API key is present', async () => {
    const jwt = app.get(JwtService);
    const expiredToken = await jwt.signAsync(
      { sub: '0123456789abcdef01234567', role: 'SALESPERSON' },
      { expiresIn: -1 }
    );
    await request(app.getHttpServer()).get('/api/v1/__test/protected').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/__test/protected')
      .set('Authorization', 'Bearer tampered')
      .set('x-api-key', 'this-is-a-test-api-key-thirty-two-chars')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/__test/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('returns the same unauthorized response for unknown users and wrong passwords', async () => {
    const userModel = app.get<Model<UserAttrs>>(getModelToken('User'));
    await userModel.create({
      email: `inactive-${email}`,
      passwordHash: 'malformed-hash',
      fullName: 'Inactive',
      role: 'SALESPERSON',
      isActive: false
    });
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong' })
      .expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password: 'wrong' })
      .expect(401);

    expect(wrong.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        message: expect.any(String),
        error: expect.any(String)
      })
    );
    expect(wrong.body).toEqual(unknown.body);
  });

  it('throttles repeated sign-in attempts', async () => {
    let status = 0;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      status = (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong' })
      ).status;
    }
    expect(status).toBe(429);
  });
});
