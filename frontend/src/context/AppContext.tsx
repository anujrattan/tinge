/**
 * App Context
 * 
 * Provides shared state (cart, user auth) across the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '../types';
import { CART_STORAGE_KEY } from '../utils/constants';
import { authService } from '../services/auth';
import api from '../services/api';
import { CurrencyCode, getStoredCurrency, saveCurrencyPreference } from '../utils/currency';
import { isCategoryAllowed } from '../utils/cookieConsent';
import { clearGuestSession } from '../utils/guestSession';
import { trackAddToCart, cartToTrackingItems } from '../utils/gtm';
import { getDisplayPrice } from '../utils/pricing';
import { setDynamicColorProfiles } from '../utils/colorUtils';

type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'luxe-threads-theme';
const WISHLIST_STORAGE_KEY = 'luxe-threads-wishlist';

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

const saveThemePreference = (theme: Theme) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    // Update document class for Tailwind dark mode
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    // Force a reflow to ensure CSS variables update
    void htmlElement.offsetHeight;
  }
};

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
}

interface AppContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  cartItemCount: number;
  cartAnimationKey: number;
  wishlist: string[];
  wishlistItemCount: number;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  loadWishlist: () => Promise<void>;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    // Load from localStorage for guests
    const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return savedWishlist ? JSON.parse(savedWishlist) : [];
  });
  const [user, setUser] = useState<User | null>(null);
  const [cartAnimationKey, setCartAnimationKey] = useState(0);
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => getStoredCurrency());
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = getStoredTheme();
    // Initialize document class on mount - must happen synchronously
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      if (storedTheme === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
      localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
    }
    return storedTheme;
  });

  // Logout function (defined early for use in useEffect)
  const logout = React.useCallback(() => {
    authService.removeToken();
    setUser(null);
    // Clear wishlist on logout (will reload from localStorage if guest)
    setWishlist([]);
  }, []);

  // Wishlist functions
  const loadWishlist = React.useCallback(async () => {
    try {
      // Try to load from API first (works for both guest and authenticated via hybrid auth)
      const response = await api.getWishlist();
      const productIds = response.items.map((item: any) => item.product_id);
      setWishlist(productIds);
      // Sync to localStorage
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds));
    } catch (error) {
      console.error('Failed to load wishlist from API, using localStorage:', error);
      // Fallback to localStorage
      const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
      setWishlist(savedWishlist ? JSON.parse(savedWishlist) : []);
    }
  }, []);

  const addToWishlist = React.useCallback(async (productId: string) => {
    // Already tracked locally — nothing to do
    if (wishlist.includes(productId)) {
      return;
    }

    // Check limit (25 items)
    if (wishlist.length >= 25) {
      throw new Error('Wishlist is full. Maximum 25 items allowed.');
    }

    try {
      await api.addToWishlist(productId);

      // Update local state + localStorage
      const updatedWishlist = [...wishlist, productId];
      setWishlist(updatedWishlist);
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updatedWishlist));
    } catch (error: any) {
      // Backend says it's already there but our local state didn't know — self-heal
      // so the icon shows the correct filled state without surfacing an error.
      if (/already in your wishlist/i.test(error.message || '')) {
        const updatedWishlist = [...wishlist, productId];
        setWishlist(updatedWishlist);
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updatedWishlist));
        return;
      }
      throw new Error(error.message || 'Failed to add to wishlist');
    }
  }, [wishlist]);

  const removeFromWishlist = React.useCallback(async (productId: string) => {
    try {
      // Call API (works for both guest and authenticated users via hybrid auth)
      // Backend handles Redis + DB storage
      await api.removeFromWishlist(productId);
      
      // Update local state + localStorage (fast cache)
      const updatedWishlist = wishlist.filter(id => id !== productId);
      setWishlist(updatedWishlist);
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updatedWishlist));
    } catch (error: any) {
      throw new Error(error.message || 'Failed to remove from wishlist');
    }
  }, [wishlist]);

  const isInWishlist = React.useCallback((productId: string): boolean => {
    return wishlist.includes(productId);
  }, [wishlist]);

  // Clear guest session after login (backend handles merge automatically)
  const clearGuestSessionAfterAuth = React.useCallback(async () => {
    // Backend has already merged guest wishlist to user during login/signup
    // Just clear the guest session ID from localStorage
    clearGuestSession();
    
    // Reload wishlist from API (now contains merged data)
    await loadWishlist();
  }, [loadWishlist]);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
          // Clear guest session and load wishlist (backend has already merged)
          await clearGuestSessionAfterAuth();
        } catch (error) {
          // Token invalid or expired, clear it
          authService.removeToken();
          setUser(null);
        }
      } else {
        // Load guest wishlist from localStorage/API
        await loadWishlist();
      }
    };
    loadUser();
  }, [loadWishlist, clearGuestSessionAfterAuth]);

  // Load canonical color profiles (DB-backed, Redis-cached) for accurate swatches
  useEffect(() => {
    let cancelled = false;
    const loadColorProfiles = async () => {
      try {
        const profiles = await api.getColorProfiles();
        if (!cancelled && Array.isArray(profiles) && profiles.length > 0) {
          setDynamicColorProfiles(profiles);
        }
      } catch (error) {
        // Non-fatal: fall back to static mappings.
        console.warn('Failed to load color profiles:', error);
      }
    };
    loadColorProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check token expiration every minute
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (user && authService.isTokenExpired()) {
        // Token expired, logout user
        logout();
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Save currency preference when it changes
  useEffect(() => {
    saveCurrencyPreference(currency);
  }, [currency]);

  // Currency setter that updates both state and localStorage
  const setCurrency = React.useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    saveCurrencyPreference(newCurrency);
  }, []);

  // Sync theme changes to DOM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Only persist theme to localStorage if functional cookies are allowed
      if (isCategoryAllowed('functional')) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
      
      const htmlElement = document.documentElement;
      
      // Toggle dark class: dark theme = has class, light theme = no class
      if (theme === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
      
      // Force a reflow to ensure CSS variables update
      void htmlElement.offsetHeight;
    }
  }, [theme]);

  // Theme setter that updates both state and localStorage
  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Toggle theme helper - use functional update to avoid stale closure
  const toggleTheme = React.useCallback(() => {
    setThemeState((currentTheme) => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      return newTheme;
    });
  }, []);

  const addToCart = (itemToAdd: CartItem) => {
    // Anchor the price at cart-add time so cart, checkout and order totals
    // all use the same clean display price without decimal artifacts.
    const anchoredPrice = getDisplayPrice(
      itemToAdd.selling_price ?? itemToAdd.price ?? 0,
      itemToAdd.discount_percentage,
      itemToAdd.on_sale,
      itemToAdd.sale_discount_percentage,
    );
    const normalizedItem: CartItem = { ...itemToAdd, price: anchoredPrice };

    setCart(prevCart => {
      const existingItem = prevCart.find(item =>
        item.id === normalizedItem.id &&
        item.selectedColor === normalizedItem.selectedColor &&
        item.selectedSize === normalizedItem.selectedSize
      );
      if (existingItem) {
        return prevCart.map(item =>
          item.id === normalizedItem.id && item.selectedColor === normalizedItem.selectedColor && item.selectedSize === normalizedItem.selectedSize
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, normalizedItem];
    });
    setCartAnimationKey(prev => prev + 1);
    const trackingPrice = anchoredPrice * normalizedItem.quantity;
    trackAddToCart({
      currency,
      value: trackingPrice,
      items: cartToTrackingItems([normalizedItem]),
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(prevCart => prevCart.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const wishlistItemCount = wishlist.length;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AppContext.Provider
      value={{
        cart,
        setCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartItemCount,
        cartAnimationKey,
        wishlist,
        wishlistItemCount,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        loadWishlist,
        user,
        isAuthenticated,
        isAdmin,
        setUser,
        logout,
        currency,
        setCurrency,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

