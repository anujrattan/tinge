/**
 * Authentication Routes
 * 
 * Handles signup, login, and token generation using Supabase Auth
 */

import { Router, Request, Response, NextFunction } from 'express';
import { generateToken } from '../utils/jwt.js';
import { supabaseAdmin, supabaseAnon } from '../services/supabase.js';
import { config } from '../config/index.js';
import jwt from 'jsonwebtoken';
import * as wishlistCache from '../services/wishlistCache.js';

const router = Router();

/**
 * Helper: Merge guest wishlist to user on login/signup
 * Transfers guest wishlist from Redis to user's DB + Redis
 * Clears guest wishlist after merge
 */
async function mergeGuestWishlistOnAuth(userId: string, guestSessionId?: string) {
  if (!guestSessionId) return;
  
  try {
    // Get guest wishlist from Redis
    const guestWishlist = await wishlistCache.getGuestWishlist(guestSessionId);
    
    if (guestWishlist.length === 0) {
      return; // No guest wishlist to merge
    }
    
    // Get user record from users table
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();
    
    if (userError || !user) {
      console.error('User not found for wishlist merge:', userError);
      return;
    }
    
    // Get existing user wishlist from DB
    const { data: existingWishlist } = await supabaseAdmin
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id);
    
    const existingProductIds = new Set(existingWishlist?.map((item: any) => item.product_id) || []);
    
    // Filter out products already in user's wishlist
    const newProductIds = guestWishlist.filter(productId => !existingProductIds.has(productId));
    
    if (newProductIds.length > 0) {
      // Insert new products into DB
      const insertData = newProductIds.map(productId => ({
        user_id: user.id,
        product_id: productId,
      }));
      
      await supabaseAdmin
        .from("wishlists")
        .insert(insertData);
    }
    
    // Merge in Redis (combine existing + new)
    const mergedProductIds = Array.from(new Set([...Array.from(existingProductIds), ...guestWishlist]));
    const userWishlistKey = wishlistCache.getUserWishlistKey(userId);
    await wishlistCache.setWishlistInCache(userWishlistKey, mergedProductIds);
    
    // Clear guest wishlist
    const guestWishlistKey = wishlistCache.getGuestWishlistKey(guestSessionId);
    await wishlistCache.clearWishlistCache(guestWishlistKey);
    
    console.log(`Merged ${newProductIds.length} guest wishlist items for user ${userId}`);
  } catch (error) {
    console.error('Error merging guest wishlist:', error);
    // Don't fail the login/signup if wishlist merge fails
  }
}

/**
 * Signup endpoint
 * Creates a new user account using Supabase Auth
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split('@')[0],
      },
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: authError.message || 'Failed to create account' });
    }
    
    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    // Ensure user_profiles record exists (create if trigger didn't fire)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, name')
      .eq('id', authData.user.id)
      .single();
    
    let userRole = 'user';
    let profileName = name || email.split('@')[0];
    
    if (!existingProfile) {
      // Create user_profiles record manually if trigger didn't create it
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          name: profileName,
          role: 'user',
        })
        .select('role, name')
        .single();
      
      if (profileError) {
        console.error('Error creating user_profile:', profileError);
        // Continue anyway - role defaults to 'user'
      } else if (newProfile) {
        userRole = newProfile.role;
        profileName = newProfile.name || profileName;
      }
    } else {
      userRole = existingProfile.role;
      profileName = existingProfile.name || profileName;
    }
    
    // Create or update user record in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single();
    
    if (!existingUser) {
      // Try to find by email
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (!userByEmail) {
        // Create minimal user record (will be updated during checkout)
        await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            email: email,
            first_name: name ? name.split(' ')[0] : profileName.split(' ')[0],
            last_name: name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '',
            address1: '', // Will be filled during checkout
            city: '',
            zip: '',
            country_code: 'IN',
            type: 'shipping',
          });
      } else {
        // Update existing user record to link auth_user_id
        await supabaseAdmin
          .from('users')
          .update({ auth_user_id: authData.user.id })
          .eq('id', userByEmail.id);
      }
    }
    
    // Get profile from database (should exist now)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, name')
      .eq('id', authData.user.id)
      .single();
    
    // Generate JWT token
    const token = generateToken({
      userId: authData.user.id,
      email: authData.user.email,
      role: userRole,
    });
    
    // Merge guest wishlist if present (for new signups)
    const guestSessionId = req.headers['x-guest-session-id'] as string;
    if (guestSessionId) {
      await mergeGuestWishlistOnAuth(authData.user.id, guestSessionId);
    }
    
    res.status(201).json({
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || profileName,
        role: userRole,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Login endpoint
 * Authenticates user with Supabase Auth and returns JWT token
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      return res.status(401).json({ error: authError.message || 'Invalid credentials' });
    }
    
    if (!authData.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    // Fetch user role from database
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, name')
      .eq('id', authData.user.id)
      .single();
    
    const userRole = profile?.role || 'user';
    
    // Generate JWT token
    const token = generateToken({
      userId: authData.user.id,
      email: authData.user.email,
      role: userRole,
    });
    
    // Merge guest wishlist if present
    const guestSessionId = req.headers['x-guest-session-id'] as string;
    if (guestSessionId) {
      await mergeGuestWishlistOnAuth(authData.user.id, guestSessionId);
    }
    
    res.json({
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || authData.user.user_metadata?.name || email.split('@')[0],
        role: userRole,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get current user endpoint
 * Returns user info from JWT token
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
        role: string;
      };
      
      // Fetch fresh user data from database
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('role, name, email')
        .eq('id', decoded.userId)
        .single();
      
      if (profile) {
        return res.json({
          id: decoded.userId,
          email: profile.email || decoded.email,
          name: profile.name || decoded.email?.split('@')[0],
          role: profile.role,
        });
      }
      
      // Fallback to decoded token data
      return res.json({
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    next(error);
  }
});

export default router;

