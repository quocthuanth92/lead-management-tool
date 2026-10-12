import { INestApplication, ValidationPipe, Controller, Get, UseGuards } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { getModelToken } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';
import { Model } from 'mongoose';
import request from 'supertest';
import helmet from 'helmet';
import {
  buildSearchFields,
  leadsVersionKey,
  LeadWriter,
  MongoLeadWriterStore,
  normalizePhone,
  PersistenceModels,
  UserAttrs,
  LeadAttrs,
  CounterAttrs,
  LeadActivityAttrs
} from '@lead/persistence';

import { API_PREFIX } from '@lead/shared-contracts';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { setupSwagger } from '../../src/common/openapi/setup-swagger';
import { CurrentUser } from '../../src/common/decorators/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { ScryptPasswordHasher } from '../../src/modules/auth/infrastructure/scrypt-password-hasher';
import { REDIS_CLIENT } from '../../src/core/redis/redis.module';
import { CreateLeadRequest, LeadLabel } from '@lead/shared-contracts';

// RediSearch (the `search` module) is required for the inbox and search indexes.
const REDIS_IMAGE = 'redis/redis-stack-server:latest';

@Controller('__test')
@UseGuards(JwtAuthGuard)
class AuthProbeController {
  @Get('protected')
  probe(@CurrentUser() user?: AuthenticatedUser): AuthenticatedUser | undefined {
    return user;
  }
}

export interface RunningIntegrationApp {
  app: INestApplication;
  mongoContainer: StartedTestContainer;
  redisContainer: StartedTestContainer;
  login(email: string, password: string): Promise<string>;
  createSalesperson(
    overrides?: Partial<{ email: string; password: string; fullName: string; isActive: boolean }>
  ): Promise<string>;
  seedLead(overrides?: Partial<CreateLeadRequest> & { userId?: string }): Promise<string>;
  seedActivity(leadId: string, userId: string, content?: string): Promise<string>;
  insertLead(
    overrides: Partial<{
      userId: string;
      fullName: string;
      phone: string;
      email: string;
      message: string;
      label: LeadLabel;
      hasView: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  ): Promise<string>;
  stopRedis(): Promise<void>;
  startRedis(): Promise<void>;
}

export async function createIntegrationApp(): Promise<RunningIntegrationApp> {
  const mongoContainer = await new GenericContainer('mongo:7').withExposedPorts(27017).start();
  let redisContainer = await new GenericContainer(REDIS_IMAGE).withExposedPorts(6379).start();

  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${mongoContainer.getMappedPort(27017)}/lead`;
  process.env.REDIS_URL = `redis://127.0.0.1:${redisContainer.getMappedPort(6379)}`;
  process.env.JWT_SECRET = 'this-is-a-test-jwt-secret-thirty-two-chars';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.LEAD_SOURCE_API_KEY = 'this-is-a-test-api-key-thirty-two-chars';
  process.env.RATE_LIMIT_TTL = '60';
  process.env.RATE_LIMIT_LIMIT = '100';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.MONGODB_SYNC_INDEXES = 'true';

  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
    controllers: [AuthProbeController]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  setupSwagger(app);
  await app.init();

  const userModel = app.get<Model<UserAttrs>>(getModelToken('User'));
  const leadModel = app.get<Model<LeadAttrs>>(getModelToken('Lead'));
  const counterModel = app.get<Model<CounterAttrs>>(getModelToken('Counter'));
  const activityModel = app.get<Model<LeadActivityAttrs>>(getModelToken('LeadActivity'));
  const redisClient = app.get<Redis>(REDIS_CLIENT);
  const hasher = new ScryptPasswordHasher();
  let redisStopped = false;
  const running: RunningIntegrationApp = {
    app,
    mongoContainer,
    get redisContainer() {
      return redisContainer;
    },
    async login(email, password) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });
      if (!response.ok || typeof response.body.accessToken !== 'string') {
        throw new Error(`Integration login failed with status ${response.status}`);
      }
      return response.body.accessToken as string;
    },
    async createSalesperson(overrides = {}) {
      const email = overrides.email ?? `sales-${randomUUID()}@example.com`;
      const password = overrides.password ?? 'test-password';
      const user = await userModel.create({
        email,
        passwordHash: await hasher.hash(password),
        fullName: overrides.fullName ?? 'Test Salesperson',
        role: 'SALESPERSON',
        isActive: overrides.isActive ?? true
      });
      return String(user._id);
    },
    async seedLead(overrides = {}) {
      const writer = new LeadWriter(
        new MongoLeadWriterStore({
          User: userModel,
          Lead: leadModel,
          Counter: counterModel
        } as Pick<PersistenceModels, 'User' | 'Lead' | 'Counter'>)
      );
      const written = await writer.writeLead(
        {
          fullName: overrides.fullName ?? 'Seed Lead',
          phone: overrides.phone ?? `+1555${randomInt(0, 10_000_000).toString().padStart(7, '0')}`,
          email: overrides.email,
          message: overrides.message ?? 'Seed message'
        },
        { source: 'INTERNAL' }
      );
      if (!('id' in written)) {
        throw new Error('Unexpected duplicate while seeding a lead');
      }
      return written.id;
    },
    async seedActivity(leadId, userId, content = 'Seed activity') {
      const activity = await activityModel.create({
        leadId,
        userId,
        authorName: 'Seed Author',
        type: 'NOTE',
        content,
        createdAt: new Date()
      });
      return String(activity._id);
    },
    async insertLead(overrides = {}) {
      const fullName = overrides.fullName ?? 'Inserted Lead';
      const phone = normalizePhone(overrides.phone ?? `+1555${randomInt(1_000_000, 9_999_999)}`);
      if (!phone) {
        throw new Error('Test lead phone must be valid');
      }
      const now = new Date();
      const lead = await leadModel.create({
        assignmentStatus: overrides.userId ? 'ASSIGNED' : 'UNASSIGNED',
        ...(overrides.userId ? { userId: overrides.userId } : {}),
        fullName,
        phone,
        ...(overrides.email ? { email: overrides.email } : {}),
        message: overrides.message ?? 'Inserted message',
        source: 'INTERNAL',
        label: overrides.label ?? 'UNLABELED',
        hasView: overrides.hasView ?? false,
        ...buildSearchFields({ fullName, email: overrides.email, phone }),
        schemaVersion: 1,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? overrides.createdAt ?? now
      });
      if (overrides.userId) {
        // Writes made through the app invalidate the user's lists; mirror that here.
        await redisClient.incr(leadsVersionKey(overrides.userId));
      }
      return String(lead._id);
    },
    async stopRedis() {
      if (!redisStopped) {
        redisClient.disconnect();
        await redisContainer.stop();
        redisStopped = true;
      }
    },
    async startRedis() {
      if (redisStopped) {
        redisContainer = await new GenericContainer(REDIS_IMAGE).withExposedPorts(6379).start();
        redisClient.options.host = redisContainer.getHost();
        redisClient.options.port = redisContainer.getMappedPort(6379);
        await redisClient.connect();
        redisStopped = false;
      }
    }
  };
  return running;
}

export async function stopIntegrationApp(running?: RunningIntegrationApp): Promise<void> {
  if (!running) {
    return;
  }
  await running.app.close();
  await running.redisContainer.stop();
  await running.mongoContainer.stop();
}
