/**
 * Authentication Service
 * 
 * Handles JWT token storage and retrieval with expiration checking
 */

const TOKEN_KEY = 'luxe_threads_auth_token';
const TOKEN_TIMESTAMP_KEY = 'luxe_threads_auth_timestamp';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export const authService = {
  getToken: (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    // Check if token has expired (30 minutes)
    const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    if (timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge > SESSION_DURATION) {
        // Token expired, remove it
        authService.removeToken();
        return null;
      }
    }
    
    return token;
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!authService.getToken();
  },

  getTokenAge: (): number | null => {
    const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    if (!timestamp) return null;
    return Date.now() - parseInt(timestamp, 10);
  },

  isTokenExpired: (): boolean => {
    const age = authService.getTokenAge();
    if (age === null) return true;
    return age > SESSION_DURATION;
  },
};

