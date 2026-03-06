/**
 * Redis Client Service
 * 
 * Provides a singleton Redis client instance for caching
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';

let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client instance
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    password: config.redis.password,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis client connected');
  });

  redisClient.on('disconnect', () => {
    console.log('⚠️ Redis client disconnected');
  });

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  set: async <T>(
    key: string,
    value: T,
    ttlSeconds: number = config.redis.defaultTTL
  ): Promise<boolean> => {
    try {
      const client = await getRedisClient();
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete key from cache
   */
  del: async (key: string): Promise<boolean> => {
    try {
      const client = await getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   */
  delPattern: async (pattern: string): Promise<number> => {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      return await client.del(keys);
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  },
};

/**
 * Cache keys
 */
export const cacheKeys = {
  categories: 'categories:all',
  category: (slug: string) => `category:${slug}`,
  categoryById: (id: string) => `category:id:${id}`,
  products: 'products:all',
  productsByCategory: (categorySlug: string) => `products:category:${categorySlug}`,
  product: (id: string) => `product:${id}`,
};

