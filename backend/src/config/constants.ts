/**
 * Application-wide constants and configuration values
 */

export const WISHLIST_CONFIG = {
  /**
   * Maximum number of items allowed in a user's wishlist
   * Easily configurable - change this value to adjust the limit
   */
  MAX_ITEMS: 25,
} as const;

export const ORDER_CONFIG = {
  /**
   * Number of days to consider for best sellers calculation
   */
  BEST_SELLERS_DAYS: 30,
} as const;

export const CACHE_CONFIG = {
  /**
   * TTL (Time To Live) for cached data in seconds
   */
  PRODUCTS_TTL: 3600, // 1 hour
  ORDERS_TTL: 86400, // 24 hours
  BEST_SELLERS_TTL: 86400, // 24 hours
} as const;
