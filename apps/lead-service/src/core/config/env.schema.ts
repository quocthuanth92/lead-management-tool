import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('1h'),
  LEAD_SOURCE_API_KEY: z.string().min(1),
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
  CORS_ORIGIN: z.string().default('http://localhost:3000')
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const key = first?.path?.[0] ? String(first.path[0]) : 'ENV';
    throw new Error(`Invalid environment variable: ${key} (${first?.message ?? 'invalid value'})`);
  }

  const env = parsed.data;
  const inTest = env.NODE_ENV === 'test';
  if (!inTest && env.JWT_SECRET.length < 32) {
    throw new Error('Invalid environment variable: JWT_SECRET (must be at least 32 characters)');
  }
  if (!inTest && env.LEAD_SOURCE_API_KEY.length < 32) {
    throw new Error(
      'Invalid environment variable: LEAD_SOURCE_API_KEY (must be at least 32 characters)'
    );
  }
  return env;
}
