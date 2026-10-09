import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export interface RunningIntegrationApp {
  app: INestApplication;
  mongoContainer: StartedTestContainer;
  redisContainer: StartedTestContainer;
}

export async function createIntegrationApp(): Promise<RunningIntegrationApp> {
  const mongoContainer = await new GenericContainer('mongo:7').withExposedPorts(27017).start();
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${mongoContainer.getMappedPort(27017)}/lead`;
  process.env.REDIS_URL = `redis://127.0.0.1:${redisContainer.getMappedPort(6379)}`;
  process.env.JWT_SECRET = 'this-is-a-test-jwt-secret-thirty-two-chars';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.LEAD_SOURCE_API_KEY = 'this-is-a-test-api-key-thirty-two-chars';
  process.env.RATE_LIMIT_TTL = '60';
  process.env.RATE_LIMIT_LIMIT = '100';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return { app, mongoContainer, redisContainer };
}

export async function stopIntegrationApp(running?: RunningIntegrationApp): Promise<void> {
  if (!running) {
    return;
  }
  await running.app.close();
  await running.redisContainer.stop();
  await running.mongoContainer.stop();
}
