/**
 * Redis Client Service
 *
 * Prefer Upstash REST on Cloudflare Workers (and when REST env is set).
 * Fall back to ioredis TCP when REDIS_URL is available (local / Node hosts).
 * Cache helpers no-op gracefully when neither backend is reachable.
 */

import { config } from '../config/index.js';

type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  setex: (key: string, expiry: number, value: string) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
  exists: (key: string) => Promise<number>;
  ping: () => Promise<string>;
  quit: () => Promise<void>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

let redisClient: RedisLike | null = null;
let redisMode: 'upstash' | 'ioredis' | 'none' = 'none';

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

function createUpstashClient(url: string, token: string): RedisLike {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  async function run<T>(...cmd: (string | number)[]): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(cmd),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upstash ${res.status}: ${text || res.statusText}`);
    }
    const body = (await res.json()) as { result?: T };
    return body.result as T;
  }

  return {
    async get(key: string) {
      const result = await run<string | null>('GET', key);
      return result ?? null;
    },
    async set(key: string, value: string) {
      return run('SET', key, value);
    },
    async setex(key: string, expiry: number, value: string) {
      return run('SET', key, value, 'EX', expiry);
    },
    async del(key: string) {
      return run('DEL', key);
    },
    async exists(key: string) {
      const result = await run<number>('EXISTS', key);
      return result ?? 0;
    },
    async ping() {
      await run('PING');
      return 'PONG';
    },
    async quit() {},
  };
}

/**
 * Get or create Redis client instance (Upstash REST or ioredis).
 */
export const getRedisClient = (): RedisLike => {
  if (redisClient) return redisClient;

  const upstash = upstashConfig();
  if (upstash) {
    redisClient = createUpstashClient(upstash.url, upstash.token);
    redisMode = 'upstash';
    return redisClient;
  }

  // Lazy-load ioredis only when TCP URL is configured (not available / needed on Workers).
  throw new Error(
    'No Redis backend configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or REDIS_URL for ioredis.'
  );
};

async function tryInitIoredis(): Promise<RedisLike | null> {
  const redisUrl = config.redis.url;
  if (!redisUrl) return null;
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    client.on('error', (error: Error) => {
      console.error('❌ Redis connection error:', error);
    });
    client.on('connect', () => console.log('✅ Redis connected'));
    client.on('ready', () => console.log('✅ Redis ready'));
    return client as unknown as RedisLike;
  } catch (error: any) {
    console.warn('⚠️  ioredis unavailable:', error?.message ?? error);
    return null;
  }
}

/**
 * Connect to Redis (Upstash REST preferred; ioredis TCP fallback).
 */
export const connectRedis = async (): Promise<void> => {
  try {
    const upstash = upstashConfig();
    if (upstash) {
      redisClient = createUpstashClient(upstash.url, upstash.token);
      redisMode = 'upstash';
      await redisClient.ping();
      console.log('✅ Upstash Redis (REST) connection verified');
      return;
    }

    const client = await tryInitIoredis();
    if (!client) {
      redisMode = 'none';
      console.warn('⚠️  Redis not configured — continuing without cache');
      return;
    }
    redisClient = client;
    redisMode = 'ioredis';
    await client.ping();
    console.log('✅ Redis connection verified');
  } catch (error: any) {
    redisMode = 'none';
    redisClient = null;
    console.warn('⚠️  Redis connection failed, continuing without cache:', error.message);
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisMode = 'none';
  }
};

export const getRedisMode = () => redisMode;

/**
 * Cache helper functions
 */
export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      if (!redisClient && redisMode === 'none') return null;
      const client = redisClient ?? getRedisClient();
      return await client.get(key);
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  },

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis getJSON error for key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: string, expiry?: number): Promise<void> {
    try {
      if (!redisClient && redisMode === 'none') return;
      const client = redisClient ?? getRedisClient();
      if (expiry) {
        await client.setex(key, expiry, value);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  },

  async setJSON(key: string, value: any, expiry?: number): Promise<void> {
    try {
      await this.set(key, JSON.stringify(value), expiry);
    } catch (error) {
      console.error(`Redis setJSON error for key ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      if (!redisClient && redisMode === 'none') return;
      const client = redisClient ?? getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      if (!redisClient && redisMode === 'none') return false;
      const client = redisClient ?? getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  },
};

/**
 * Cache key helpers
 */
export const cacheKeys = {
  products: 'products:all',
  productsByCategory: (categorySlug: string) => `products:category:${categorySlug}`,
  product: (id: string) => `product:${id}`,
  categories: 'categories:all',
  categoriesActive: 'categories:active',
  category: (slug: string) => `category:${slug}`,
  colorProfiles: 'colors:profiles',
};
