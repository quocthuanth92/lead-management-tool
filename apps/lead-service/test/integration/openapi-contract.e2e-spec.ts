import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UserAttrs } from '@lead/persistence';
import Ajv from 'ajv';
import { parse } from 'yaml';
import { Model } from 'mongoose';
import request from 'supertest';

import {
  createIntegrationApp,
  RunningIntegrationApp,
  stopIntegrationApp
} from './test-app.factory';

const API_KEY = 'this-is-a-test-api-key-thirty-two-chars';
const SPEC_PATH = join(
  __dirname,
  '../../../../specs/003-lead-management/contracts/lead-service.openapi.yaml'
);

type JsonObject = Record<string, unknown>;

describe('Lead service responses match the OpenAPI contract', () => {
  const spec = parse(readFileSync(SPEC_PATH, 'utf8')) as JsonObject & {
    components: JsonObject;
    paths: Record<string, Record<string, { responses: Record<string, JsonObject> }>>;
  };
  const ajv = new Ajv({ strict: false, allErrors: true });
  ajv.addFormat('date-time', {
    validate: (value: string) =>
      /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.test(value) &&
      !Number.isNaN(Date.parse(value))
  });
  ajv.addFormat('email', { validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) });

  let running: RunningIntegrationApp;
  let app: INestApplication;
  let users: Model<UserAttrs>;
  let tokenA: string;
  let leadId: string;
  let activityId: string;

  function schemaFor(path: string, method: string, status: string): JsonObject {
    const response = spec.paths[path]?.[method]?.responses[status] as {
      content?: Record<string, { schema: JsonObject }>;
    };
    const schema = response?.content?.['application/json']?.schema;
    if (!schema) {
      throw new Error(`No ${status} schema for ${method.toUpperCase()} ${path}`);
    }
    return schema;
  }

  function componentSchema(name: string): JsonObject {
    return { $ref: `#/components/schemas/${name}` };
  }

  function expectMatches(schema: JsonObject, body: unknown): void {
    const validate = ajv.compile({ ...schema, components: spec.components });
    if (!validate(body)) {
      throw new Error(`Response does not match contract: ${JSON.stringify(validate.errors)}`);
    }
  }

  beforeAll(async () => {
    running = await createIntegrationApp();
    app = running.app;
    users = app.get<Model<UserAttrs>>(getModelToken('User'));
    await users.deleteMany({ role: 'SALESPERSON' });
    await running.createSalesperson({
      email: 'contract-a@example.com',
      fullName: 'Contract Seller'
    });
    tokenA = await running.login('contract-a@example.com', 'test-password');
  });

  afterAll(async () => {
    await stopIntegrationApp(running);
  });

  it('validates the login response', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'contract-a@example.com', password: 'test-password' })
      .expect(200);

    expectMatches(schemaFor('/auth/login', 'post', '200'), response.body);
  });

  it('validates ingestion, inbox, search, details, label, and activity responses', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('x-api-key', API_KEY)
      .send({ fullName: 'Contract Customer', phone: '15550004444', message: 'Contract check' })
      .expect(201);
    expectMatches(schemaFor('/leads', 'post', '201'), created.body);
    leadId = created.body.id as string;

    const authorised = { Authorization: `Bearer ${tokenA}` };
    const inbox = await request(app.getHttpServer())
      .get('/api/v1/leads')
      .set(authorised)
      .expect(200);
    expectMatches(schemaFor('/leads', 'get', '200'), inbox.body);

    const search = await request(app.getHttpServer())
      .get('/api/v1/leads/search?q=contract')
      .set(authorised)
      .expect(200);
    expectMatches(schemaFor('/leads/search', 'get', '200'), search.body);

    const details = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set(authorised)
      .expect(200);
    expectMatches(schemaFor('/leads/{id}', 'get', '200'), details.body);

    const label = await request(app.getHttpServer())
      .put(`/api/v1/leads/${leadId}/label`)
      .set(authorised)
      .send({ label: 'POTENTIAL' })
      .expect(200);
    expectMatches(schemaFor('/leads/{id}/label', 'put', '200'), label.body);

    const activity = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/activities`)
      .set(authorised)
      .send({ content: 'Contract note', type: 'CALL' })
      .expect(201);
    expectMatches(schemaFor('/leads/{id}/activities', 'post', '201'), activity.body);
    activityId = activity.body.id as string;

    const activities = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}/activities`)
      .set(authorised)
      .expect(200);
    expectMatches(schemaFor('/leads/{id}/activities', 'get', '200'), activities.body);
    expect(activityId).toBeDefined();
  });

  it('validates the error responses against the shared ErrorResponse shape', async () => {
    const errorSchema = componentSchema('ErrorResponse');
    const unauthorised = await request(app.getHttpServer()).get('/api/v1/leads').expect(401);
    expectMatches(errorSchema, unauthorised.body);

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/leads?limit=500')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);
    expectMatches(errorSchema, invalid.body);

    const missing = await request(app.getHttpServer())
      .get('/api/v1/leads/65b000000000000000000099')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
    expectMatches(errorSchema, missing.body);
  });
});
