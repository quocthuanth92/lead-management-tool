import { Connection, InferSchemaType, Model } from 'mongoose';

import { CounterSchema } from './schemas/counter.schema';
import { LeadActivitySchema } from './schemas/lead-activity.schema';
import { LeadSchema } from './schemas/lead.schema';
import { UserSchema } from './schemas/user.schema';

export type UserAttrs = InferSchemaType<typeof UserSchema>;
export type LeadAttrs = InferSchemaType<typeof LeadSchema>;
export type LeadActivityAttrs = InferSchemaType<typeof LeadActivitySchema>;
export type CounterAttrs = InferSchemaType<typeof CounterSchema>;

export interface PersistenceModels {
  User: Model<UserAttrs>;
  Lead: Model<LeadAttrs>;
  LeadActivity: Model<LeadActivityAttrs>;
  Counter: Model<CounterAttrs>;
}

export const MODEL_DEFINITIONS = [
  { name: 'User', schema: UserSchema, collection: 'users' },
  { name: 'Lead', schema: LeadSchema, collection: 'leads' },
  { name: 'LeadActivity', schema: LeadActivitySchema, collection: 'lead_activities' },
  { name: 'Counter', schema: CounterSchema, collection: 'counters' }
] as const;

export function registerModels(connection: Connection): PersistenceModels {
  const models: Record<string, Model<any>> = {};
  for (const { name, schema, collection } of MODEL_DEFINITIONS) {
    models[name] = connection.models[name] ?? connection.model(name, schema, collection);
  }
  return models as unknown as PersistenceModels;
}
