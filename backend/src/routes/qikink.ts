/**
 * Qikink API Routes
 * 
 * Test endpoints for Qikink API connection
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getQikinkToken, clearQikinkToken } from '../services/qikink.js';

const router = Router();

/**
 * Test Qikink token retrieval
 * GET /api/qikink/token
 * 
 * Fetches and returns the Qikink access token (from cache or API)
 */
router.get('/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await getQikinkToken();
    
    res.json({
      success: true,
      message: 'Qikink token retrieved successfully',
      token: token.substring(0, 20) + '...', // Only show first 20 chars for security
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Clear cached Qikink token
 * DELETE /api/qikink/token
 * 
 * Clears the cached token (useful for testing or forcing refresh)
 */
router.delete('/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await clearQikinkToken();
    
    res.json({
      success: true,
      message: 'Qikink token cleared from cache',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

