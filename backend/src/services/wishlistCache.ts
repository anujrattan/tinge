/**
 * Wishlist Cache Service
 * 
 * Handles Redis caching for wishlists (both guest and authenticated users)
 * Storage format: Array of product IDs
 * Keys: 
 *   - Guest: wishlist:guest:{sessionId}
 *   - User: wishlist:user:{userId}
 */

import { cache } from './redis.js';

const WISHLIST_KEY_PREFIX = 'wishlist';

/**
 * Get Redis key for guest wishlist
 */
export function getGuestWishlistKey(sessionId: string): string {
  return `${WISHLIST_KEY_PREFIX}:guest:${sessionId}`;
}

/**
 * Get Redis key for user wishlist
 */
export function getUserWishlistKey(userId: string): string {
  return `${WISHLIST_KEY_PREFIX}:user:${userId}`;
}

/**
 * Get wishlist from Redis
 * @returns Array of product IDs or null if not found
 */
export async function getWishlistFromCache(key: string): Promise<string[] | null> {
  try {
    const cached = await cache.get(key);
    if (!cached) return null;
    
    const wishlist = JSON.parse(cached);
    return Array.isArray(wishlist) ? wishlist : null;
  } catch (error) {
    console.error('Redis get wishlist error:', error);
    return null;
  }
}

/**
 * Set wishlist in Redis (no expiry)
 */
export async function setWishlistInCache(key: string, productIds: string[]): Promise<boolean> {
  try {
    await cache.set(key, JSON.stringify(productIds));
    return true;
  } catch (error) {
    console.error('Redis set wishlist error:', error);
    return false;
  }
}

/**
 * Add product to wishlist in Redis
 */
export async function addToWishlistCache(key: string, productId: string): Promise<boolean> {
  try {
    const wishlist = await getWishlistFromCache(key) || [];
    
    // Check if already exists
    if (wishlist.includes(productId)) {
      return true; // Already in wishlist
    }
    
    wishlist.push(productId);
    return await setWishlistInCache(key, wishlist);
  } catch (error) {
    console.error('Redis add to wishlist error:', error);
    return false;
  }
}

/**
 * Remove product from wishlist in Redis
 */
export async function removeFromWishlistCache(key: string, productId: string): Promise<boolean> {
  try {
    const wishlist = await getWishlistFromCache(key) || [];
    const updated = wishlist.filter(id => id !== productId);
    
    return await setWishlistInCache(key, updated);
  } catch (error) {
    console.error('Redis remove from wishlist error:', error);
    return false;
  }
}

/**
 * Clear wishlist from Redis
 */
export async function clearWishlistCache(key: string): Promise<boolean> {
  try {
    await cache.del(key);
    return true;
  } catch (error) {
    console.error('Redis clear wishlist error:', error);
    return false;
  }
}

/**
 * Get guest wishlist
 */
export async function getGuestWishlist(sessionId: string): Promise<string[]> {
  const key = getGuestWishlistKey(sessionId);
  return await getWishlistFromCache(key) || [];
}

/**
 * Get user wishlist from cache
 */
export async function getUserWishlistFromCache(userId: string): Promise<string[] | null> {
  const key = getUserWishlistKey(userId);
  return await getWishlistFromCache(key);
}

/**
 * Merge guest wishlist into user wishlist
 * Used during login/signup
 * @returns Merged array of product IDs (unique)
 */
export async function mergeGuestWishlistToUser(
  guestSessionId: string, 
  userId: string
): Promise<string[]> {
  try {
    // Get both wishlists
    const guestWishlist = await getGuestWishlist(guestSessionId);
    const userWishlist = await getUserWishlistFromCache(userId) || [];
    
    // Merge and deduplicate
    const merged = Array.from(new Set([...userWishlist, ...guestWishlist]));
    
    // Save merged to user cache
    const userKey = getUserWishlistKey(userId);
    await setWishlistInCache(userKey, merged);
    
    // Clear guest cache
    const guestKey = getGuestWishlistKey(guestSessionId);
    await clearWishlistCache(guestKey);
    
    return merged;
  } catch (error) {
    console.error('Error merging guest wishlist to user:', error);
    throw error;
  }
}
