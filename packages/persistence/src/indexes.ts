import type { Connection, IndexDefinition, IndexOptions, Schema } from 'mongoose';

export interface IndexSpec {
  fields: IndexDefinition;
  options?: IndexOptions;
}

export const USER_INDEXES: IndexSpec[] = [{ fields: { email: 1 }, options: { unique: true } }];

export const LEAD_INDEXES: IndexSpec[] = [
  { fields: { userId: 1, hasView: 1, updatedAt: -1 } },
  {
    fields: { externalEventId: 1 },
    options: { unique: true, partialFilterExpression: { externalEventId: { $type: 'string' } } }
  },
  {
    fields: { createdAt: 1 },
    options: { partialFilterExpression: { assignmentStatus: 'UNASSIGNED' } }
  }
];

export const LEAD_ACTIVITY_INDEXES: IndexSpec[] = [{ fields: { leadId: 1, createdAt: -1 } }];

export function attachIndexes(schema: Schema, specs: IndexSpec[]): void {
  for (const { fields, options } of specs) {
    schema.index(fields, options);
  }
}

export async function syncAllIndexes(connection: Connection): Promise<void> {
  const { registerModels } = await import('./models');
  const models = registerModels(connection);
  await Promise.all(Object.values(models).map((model) => model.syncIndexes()));
}
