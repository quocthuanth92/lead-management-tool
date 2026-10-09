export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number | null>;
  getNumber(key: string): Promise<number | null>;
}

export const CACHE_PORT = Symbol('CACHE_PORT');
