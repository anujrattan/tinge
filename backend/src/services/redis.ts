/**
 * Redis Client Service
 * 
 * Provides a singleton Redis client for caching
 */

import Redis from 'ioredis';
import { config } from '../config/index.js';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const redisUrl = config.redis.url || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true, // Don't connect immediately
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready');
    });
  }

  return redisClient;
};

/**
 * Connect to Redis (ioredis connects automatically, but we can trigger it)
 */
export const connectRedis = async (): Promise<void> => {
  try {
    const client = getRedisClient();
    // ioredis connects automatically, but we can ping to verify connection
    await client.ping();
    console.log('✅ Redis connection verified');
  } catch (error: any) {
    console.warn('⚠️  Redis connection failed, continuing without cache:', error.message);
    // Don't throw - allow app to continue without Redis
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache (as string)
   */
  async get(key: string): Promise<string | null> {
    try {
      const client = getRedisClient();
      return await client.get(key);
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Get JSON value from cache
   */
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

  /**
   * Set value in cache with optional expiration (in seconds)
   */
  async set(key: string, value: string, expiry?: number): Promise<void> {
    try {
      const client = getRedisClient();
      if (expiry) {
        await client.setex(key, expiry, value);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  },

  /**
   * Set JSON value in cache with optional expiration (in seconds)
   */
  async setJSON(key: string, value: any, expiry?: number): Promise<void> {
    try {
      await this.set(key, JSON.stringify(value), expiry);
    } catch (error) {
      console.error(`Redis setJSON error for key ${key}:`, error);
    }
  },

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
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
};

