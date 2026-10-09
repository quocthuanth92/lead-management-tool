import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3002),
  MONGODB_URI: z.string().url(),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CLIENT_ID: z.string().default('lead-background-service'),
  KAFKA_GROUP_ID: z.string().default('lead-consumer'),
  KAFKA_LEADS_TOPIC: z.string().default('leads.incoming'),
  KAFKA_LEADS_DLQ_TOPIC: z.string().default('leads.incoming.dlq')
});

export type BackgroundEnv = z.infer<typeof envSchema>;

export function validateBackgroundEnv(config: Record<string, unknown>): BackgroundEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const key = first?.path?.[0] ? String(first.path[0]) : 'ENV';
    throw new Error(`Invalid environment variable: ${key} (${first?.message ?? 'invalid value'})`);
  }
  return parsed.data;
}
