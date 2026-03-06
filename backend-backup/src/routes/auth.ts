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

const router = Router();

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
      email_confirm: true, // Auto-confirm email (for development)
      user_metadata: {
        name: name || email.split('@')[0],
      },
    });
    
    if (authError) {
      // Handle specific Supabase errors
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: authError.message || 'Failed to create account' });
    }
    
    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    // Profile will be created automatically by database trigger
    // But let's ensure it exists and fetch the role from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, name')
      .eq('id', authData.user.id)
      .single();
    
    // If profile doesn't exist (shouldn't happen due to trigger), create it
    if (profileError || !profile) {
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name: name || email.split('@')[0],
          role: 'user', // Always 'user' for new signups
        });
      
      if (insertError) {
        console.error('Failed to create user profile:', insertError);
      }
    }
    
    // Get role from profile (always 'user' for new signups)
    const userRole = profile?.role || 'user';
    
    // Generate JWT token for the new user (30 minute expiration)
    const token = generateToken({
      userId: authData.user.id,
      email: authData.user.email,
      role: userRole,
    });
    
    res.status(201).json({
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || name || email.split('@')[0],
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
    
    // Authenticate with Supabase Auth using anon client (for user sign-in)
    // Note: signInWithPassword requires anon key, not service role key
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
    
    // Fetch user role from database profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, name')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile) {
      // If profile doesn't exist, create it with default 'user' role
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: 'user',
        });
      
      if (insertError) {
        console.error('Failed to create user profile:', insertError);
        return res.status(500).json({ error: 'Failed to load user profile' });
      }
      
      // Use default role if profile creation succeeded
      const userRole = 'user';
      const userName = authData.user.user_metadata?.name || email.split('@')[0];
      
      const token = generateToken({
        userId: authData.user.id,
        email: authData.user.email,
        role: userRole,
      });
      
      return res.json({
        token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: userName,
          role: userRole,
        },
      });
    }
    
    // Use role from database
    const userRole = profile.role;
    
    // Generate JWT token (30 minute expiration)
    const token = generateToken({
      userId: authData.user.id,
      email: authData.user.email,
      role: userRole,
    });
    
    res.json({
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile.name || authData.user.user_metadata?.name || email.split('@')[0],
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
    
    // Verify token and get user info
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
        role: string;
      };
      
      // Fetch fresh user data from database (including role)
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('role, name, email')
          .eq('id', decoded.userId)
          .single();
        
        if (!profileError && profile) {
          return res.json({
            id: decoded.userId,
            email: profile.email || decoded.email,
            name: profile.name || decoded.email?.split('@')[0],
            role: profile.role, // Always use role from database
          });
        }
      } catch (dbError) {
        // If database lookup fails, return decoded token data
        console.error('Failed to fetch user profile:', dbError);
      }
      
      // Fallback to decoded token data (shouldn't happen in normal flow)
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

/**
 * Verify token endpoint
 */
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    // Token validation is handled by middleware
    // This endpoint can be used to check token validity
    res.json({ valid: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

