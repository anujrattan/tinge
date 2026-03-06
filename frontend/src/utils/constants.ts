/**
 * Application-wide constants
 */

export const TAX_RATE = 0.08; // 8% tax rate

export const CART_STORAGE_KEY = 'luxe-threads-cart';

// Use a relaxed import.meta cast so this works in both Vite and tests.
const env = (import.meta as any).env ?? {};
export const ADMIN_PASSWORD = env.VITE_ADMIN_PASSWORD || 'admin123';

export const API_ENDPOINTS = {
  PRODUCTS: '/api/products',
  CATEGORIES: '/api/categories',
  ORDERS: '/api/orders',
  AUTH: '/api/auth',
} as const;

