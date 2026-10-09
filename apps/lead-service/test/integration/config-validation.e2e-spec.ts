import { validateEnv } from '../../src/core/config/env.schema';

describe('Environment validation', () => {
  it('fails fast with a named key for invalid env', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        PORT: '3001',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: '12345678901234567890123456789012',
        JWT_EXPIRES_IN: '1h',
        LEAD_SOURCE_API_KEY: '12345678901234567890123456789012'
      })
    ).toThrow(/MONGODB_URI/);
  });
});
