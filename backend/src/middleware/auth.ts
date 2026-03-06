/**
 * Authentication Middleware
 * 
 * Validates JWT tokens from frontend requests
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  guestSessionId?: string;
  isGuest?: boolean;
}

/**
 * Middleware to authenticate requests from frontend
 * Expects Authorization header: "Bearer <token>"
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      role?: string;
    };
    
    req.userId = decoded.userId;
    req.userRole = decoded.role || 'user';
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user is admin
 * Must be used after authenticateToken
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        role?: string;
      };
      req.userId = decoded.userId;
      req.userRole = decoded.role || 'user';
    } catch (error) {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
};

/**
 * Hybrid Authentication: Allows both authenticated users and guest users
 * 
 * Authenticated users: Requires Bearer token
 * Guest users: Requires X-Guest-Session-Id header
 * 
 * Sets either req.userId (authenticated) or req.guestSessionId (guest)
 */
export const authenticateOrGuest = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  // Try to authenticate with token first
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        role?: string;
      };
      
      req.userId = decoded.userId;
      req.userRole = decoded.role || 'user';
      req.isGuest = false;
      return next();
    } catch (error) {
      // Invalid token - try guest session
    }
  }
  
  // Try guest session ID
  const guestSessionId = req.headers['x-guest-session-id'] as string;
  
  if (guestSessionId && typeof guestSessionId === 'string' && guestSessionId.length > 0) {
    // Validate format (should be UUID-like)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(guestSessionId)) {
      req.guestSessionId = guestSessionId;
      req.isGuest = true;
      return next();
    }
  }
  
  // Neither auth token nor valid guest session ID provided
  return res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please provide either a valid auth token or guest session ID'
  });
};
