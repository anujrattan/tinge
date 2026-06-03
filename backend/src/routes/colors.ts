/**
 * Color Profiles Routes
 *
 * Canonical mapping of color name -> hex used for swatches.
 * Backed by DB and cached in Redis for fast retrieval.
 */

import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../services/supabase.js';
import { cache, cacheKeys } from '../services/redis.js';

const router = Router();

const CACHE_TTL = 24 * 60 * 60; // 24 hours

type ColorProfile = {
  name: string;
  hex: string;
};

const normalizeHex = (hex: string) => hex.trim().toUpperCase();
const isValidHex = (hex: string) => /^#[0-9A-F]{6}$/.test(hex);

async function loadColorProfilesFromDb(): Promise<ColorProfile[]> {
  const { data, error } = await supabaseAdmin
    .from('color_profiles')
    .select('name,hex')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row: any) => ({
      name: String(row.name || '').trim(),
      hex: normalizeHex(String(row.hex || '')),
    }))
    .filter((p: ColorProfile) => p.name && isValidHex(p.hex));
}

// Public: get all color profiles (Redis-cached). Admin can pass ?refresh=1 to reload from DB and rewrite cache
// (e.g. after SQL migrations that seed color_profiles — otherwise swatches miss new names until TTL expires).
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = String(req.query.refresh) === '1' && req.userRole === 'admin';

    if (!forceRefresh) {
      const cached = await cache.getJSON<ColorProfile[]>(cacheKeys.colorProfiles);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return res.json({ profiles: cached, source: 'cache' });
      }
    }

    const profiles = await loadColorProfilesFromDb();
    await cache.setJSON(cacheKeys.colorProfiles, profiles, CACHE_TTL);
    res.json({ profiles, source: forceRefresh ? 'db-refresh' : 'db' });
  } catch (error: any) {
    next(error);
  }
});

// Admin: upsert a color profile and refresh cache
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const name = String(req.body?.name || '').trim();
      const hexRaw = String(req.body?.hex || '').trim();
      const hex = normalizeHex(hexRaw);

      if (!name) {
        return res.status(400).json({ error: 'Missing color name.' });
      }
      if (!isValidHex(hex)) {
        return res.status(400).json({ error: 'Invalid hex. Expected format #RRGGBB.' });
      }

      const { data, error } = await supabaseAdmin
        .from('color_profiles')
        .upsert(
          [{ name, hex }],
          {
            onConflict: 'name',
          },
        )
        .select('name,hex')
        .single();

      if (error) throw error;

      // Refresh cache (best-effort)
      try {
        const profiles = await loadColorProfilesFromDb();
        await cache.setJSON(cacheKeys.colorProfiles, profiles, CACHE_TTL);
      } catch (cacheRefreshError) {
        console.warn('Failed to refresh color profiles cache:', cacheRefreshError);
      }

      res.status(201).json({ profile: data });
    } catch (error: any) {
      next(error);
    }
  },
);

export default router;

