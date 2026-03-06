/**
 * Guest Session Management
 * 
 * Generates and manages a unique session ID for guest users
 * Used to track guest wishlists in Redis before authentication
 */

const GUEST_SESSION_KEY = 'luxe-threads-guest-session-id';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or create guest session ID
 * Returns existing ID from localStorage or generates a new one
 */
export function getGuestSessionId(): string {
  if (typeof window === 'undefined') {
    return ''; // SSR safety
  }
  
  try {
    let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
    
    if (!sessionId) {
      sessionId = generateUUID();
      localStorage.setItem(GUEST_SESSION_KEY, sessionId);
    }
    
    return sessionId;
  } catch (error) {
    console.error('Failed to get/create guest session ID:', error);
    return '';
  }
}

/**
 * Clear guest session ID from localStorage
 * Called after successful merge on login/signup
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(GUEST_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear guest session ID:', error);
  }
}

/**
 * Check if user has an active guest session
 */
export function hasGuestSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return localStorage.getItem(GUEST_SESSION_KEY) !== null;
  } catch (error) {
    return false;
  }
}
