import { Types } from 'mongoose';
import mongoose, { Connection } from 'mongoose';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { PersistenceModels, registerModels, syncAllIndexes } from '../src';

export interface MongoTestContext {
  container: StartedTestContainer;
  connection: Connection;
  models: PersistenceModels;
}

export async function startMongoTestContext(): Promise<MongoTestContext> {
  const container = await new GenericContainer('mongo:7').withExposedPorts(27017).start();
  const uri = `mongodb://${container.getHost()}:${container.getMappedPort(27017)}/lead_test?directConnection=true`;
  const connection = await mongoose.createConnection(uri).asPromise();
  const models = registerModels(connection);
  await syncAllIndexes(connection);
  return { container, connection, models };
}

export async function stopMongoTestContext(context?: MongoTestContext): Promise<void> {
  if (!context) {
    return;
  }
  await context.connection.close();
  await context.container.stop();
}

export function buildLead(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    userId: new Types.ObjectId(),
    assignmentStatus: 'ASSIGNED',
    fullName: 'Ann Lee',
    phone: '5551234567',
    message: 'Interested in a test drive',
    source: 'INTERNAL',
    fullNameSearch: 'ann lee',
    phoneDigits: '5551234567',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
