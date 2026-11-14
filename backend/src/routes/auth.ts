/**
 * Authentication Routes
 * 
 * Handles signup, login, and token generation using Supabase Auth
 */

import { Router, Request, Response, NextFunction } from 'express';
import { generateToken } from '../utils/jwt.js';
import { supabaseAdmin, supabaseAnon } from '../services/supabase.js';
import { ensureTingeMembership, hasTingeApp, TINGE_APP_ID } from '../services/tingeAuth.js';
import { config } from '../config/index.js';
import jwt from 'jsonwebtoken';
import * as wishlistCache from '../services/wishlistCache.js';

const router = Router();

async function issueTingeSession(
  user: { id: string; email?: string | null; phone?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
  opts?: { name?: string; email?: string; guestSessionId?: string }
) {
  const profile = await ensureTingeMembership(user, {
    name: opts?.name,
    email: opts?.email || user.email || undefined,
  });

  if (opts?.guestSessionId) {
    await mergeGuestWishlistOnAuth(user.id, opts.guestSessionId);
  }

  const email = profile.email || user.email || opts?.email || '';
  const token = generateToken({
    userId: user.id,
    email,
    role: profile.role || 'user',
  });

  return {
    token,
    user: {
      id: user.id,
      email,
      name: profile.name || opts?.name || email.split('@')[0] || 'User',
      role: profile.role || 'user',
    },
  };
}

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
      .from("tinge_users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();
    
    if (userError || !user) {
      console.error('User not found for wishlist merge:', userError);
      return;
    }
    
    // Get existing user wishlist from DB
    const { data: existingWishlist } = await supabaseAdmin
      .from("tinge_wishlists")
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
        .from("tinge_wishlists")
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
    
    // Create user in shared Auth, tagged for Tinge only
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        apps: [TINGE_APP_ID],
      },
      user_metadata: {
        name: name || email.split('@')[0],
      },
    });

    // Same email already exists (e.g. real-estate account): verify password and join Tinge
    if (authError?.message?.toLowerCase().includes('already')) {
      const { data: signedIn, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signedIn.user) {
        return res.status(409).json({
          error: 'Email already registered. Sign in with that password to join Tinge, or reset it.',
          code: 'EMAIL_EXISTS',
        });
      }

      const session = await issueTingeSession(signedIn.user, {
        name,
        email,
        guestSessionId: req.headers['x-guest-session-id'] as string | undefined,
      });
      return res.status(200).json({ ...session, joinedExistingAuth: true });
    }

    if (authError) {
      return res.status(400).json({ error: authError.message || 'Failed to create account' });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const profileName = name || email.split('@')[0];
    const session = await issueTingeSession(authData.user, {
      name: profileName,
      email,
      guestSessionId: req.headers['x-guest-session-id'] as string | undefined,
    });

    // Commerce user row (checkout may fill address later)
    const { data: existingUser } = await supabaseAdmin
      .from('tinge_users')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (!existingUser) {
      const { data: userByEmail } = await supabaseAdmin
        .from('tinge_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userByEmail) {
        await supabaseAdmin.from('tinge_users').insert({
          auth_user_id: authData.user.id,
          email,
          first_name: profileName.split(' ')[0],
          last_name: profileName.split(' ').slice(1).join(' ') || '',
          address1: '',
          city: '',
          zip: '',
          country_code: 'IN',
          type: 'shipping',
        });
      } else {
        await supabaseAdmin
          .from('tinge_users')
          .update({ auth_user_id: authData.user.id })
          .eq('id', userByEmail.id);
      }
    }

    res.status(201).json(session);
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

    const { data: profile } = await supabaseAdmin
      .from('tinge_user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    // Password ok for shared Auth, but not a Tinge member yet
    if (!profile && !hasTingeApp(authData.user)) {
      return res.status(403).json({
        error: 'This email is registered for another app. Sign up on Tinge to link it.',
        code: 'NOT_TINGE_USER',
      });
    }

    const session = await issueTingeSession(authData.user, {
      email,
      guestSessionId: req.headers['x-guest-session-id'] as string | undefined,
    });
    res.json(session);
  } catch (error: any) {
    next(error);
  }
});

/**
 * Send email or phone OTP (Supabase Auth).
 * Email OTP: enable via Auth email template using {{ .Token }}.
 * Phone OTP: enable Phone provider + SMS (Twilio / MessageBird / etc.) in Supabase dashboard.
 */
router.post('/otp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone } = req.body as { email?: string; phone?: string };

    if ((!email && !phone) || (email && phone)) {
      return res.status(400).json({ error: 'Provide exactly one of email or phone' });
    }

    if (email) {
      const { error } = await supabaseAnon.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          data: { name: email.split('@')[0] },
        },
      });
      if (error) {
        return res.status(400).json({ error: error.message || 'Failed to send email OTP' });
      }
      return res.json({ ok: true, channel: 'email', message: 'OTP sent if the address is valid' });
    }

    const normalized = String(phone).replace(/\s+/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      return res.status(400).json({
        error: 'Phone must be E.164 (e.g. +9198XXXXXXXX)',
      });
    }

    const { error } = await supabaseAnon.auth.signInWithOtp({
      phone: normalized,
      options: { shouldCreateUser: true },
    });
    if (error) {
      return res.status(400).json({
        error: error.message || 'Failed to send SMS OTP (is Phone auth + SMS provider configured?)',
      });
    }
    return res.json({ ok: true, channel: 'sms', message: 'OTP sent if the number is valid' });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Verify email/phone OTP, tag Tinge membership, return app JWT.
 */
router.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, token, name } = req.body as {
      email?: string;
      phone?: string;
      token?: string;
      name?: string;
    };

    if (!token || String(token).length < 4) {
      return res.status(400).json({ error: 'OTP token is required' });
    }
    if ((!email && !phone) || (email && phone)) {
      return res.status(400).json({ error: 'Provide exactly one of email or phone' });
    }

    const verifyPayload = email
      ? { email: email.trim().toLowerCase(), token: String(token), type: 'email' as const }
      : { phone: String(phone).replace(/\s+/g, ''), token: String(token), type: 'sms' as const };

    const { data, error } = await supabaseAnon.auth.verifyOtp(verifyPayload);
    if (error || !data.user) {
      return res.status(401).json({ error: error?.message || 'Invalid or expired OTP' });
    }

    const session = await issueTingeSession(data.user, {
      name,
      email: email?.trim().toLowerCase(),
      guestSessionId: req.headers['x-guest-session-id'] as string | undefined,
    });

    res.json(session);
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
        .from('tinge_user_profiles')
        .select('role, name, email')
        .eq('id', decoded.userId)
        .single();
      
      if (!profile) {
        return res.status(403).json({ error: 'Not a Tinge user', code: 'NOT_TINGE_USER' });
      }

      return res.json({
        id: decoded.userId,
        email: profile.email || decoded.email,
        name: profile.name || decoded.email?.split('@')[0],
        role: profile.role,
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    next(error);
  }
});

export default router;

