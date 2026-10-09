import { validateEnv } from '../../src/core/config/env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
  MONGODB_URI: 'mongodb://localhost:27017/lead',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: '12345678901234567890123456789012',
  JWT_EXPIRES_IN: '1h',
  LEAD_SOURCE_API_KEY: '12345678901234567890123456789012'
};

describe('Environment validation', () => {
  it('fails fast with a named key for invalid env', () => {
    expect(() => validateEnv({ ...validEnv, MONGODB_URI: undefined })).toThrow(/MONGODB_URI/);
  });

  it('applies defaults for the cache TTLs', () => {
    const env = validateEnv(validEnv);

    expect(env.CACHE_LIST_TTL_SECONDS).toBe(60);
    expect(env.CACHE_LEAD_TTL_SECONDS).toBe(300);
  });

  it('reads cache TTL overrides', () => {
    const env = validateEnv({
      ...validEnv,
      CACHE_LIST_TTL_SECONDS: '30',
      CACHE_LEAD_TTL_SECONDS: '120'
    });

    expect(env.CACHE_LIST_TTL_SECONDS).toBe(30);
    expect(env.CACHE_LEAD_TTL_SECONDS).toBe(120);
  });

  it('rejects an invalid cache TTL naming the key', () => {
    expect(() => validateEnv({ ...validEnv, CACHE_LIST_TTL_SECONDS: '0' })).toThrow(
      /CACHE_LIST_TTL_SECONDS/
    );
  });

  describe('MONGODB_SYNC_INDEXES', () => {
    it('defaults to true outside production', () => {
      expect(validateEnv(validEnv).MONGODB_SYNC_INDEXES).toBe(true);
      expect(validateEnv({ ...validEnv, NODE_ENV: 'test' }).MONGODB_SYNC_INDEXES).toBe(true);
    });

    it('defaults to false in production', () => {
      expect(validateEnv({ ...validEnv, NODE_ENV: 'production' }).MONGODB_SYNC_INDEXES).toBe(false);
    });

    it('honors an explicit value', () => {
      expect(
        validateEnv({ ...validEnv, NODE_ENV: 'production', MONGODB_SYNC_INDEXES: 'true' })
          .MONGODB_SYNC_INDEXES
      ).toBe(true);
      expect(validateEnv({ ...validEnv, MONGODB_SYNC_INDEXES: 'false' }).MONGODB_SYNC_INDEXES).toBe(
        false
      );
    });

    it('rejects a non-boolean value naming the key', () => {
      expect(() => validateEnv({ ...validEnv, MONGODB_SYNC_INDEXES: 'yes' })).toThrow(
        /MONGODB_SYNC_INDEXES/
      );
    });
  });
});
