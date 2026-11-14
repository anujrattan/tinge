/**
 * Custom Art ("Your Art") API Routes
 *
 * Customer flow:
 *  - Upload artwork or generated room mockup to Supabase `custom-art` bucket
 *  - Create/update a `tinge_custom_art_requests` record before checkout
 *
 * Admin flow:
 *  - List all custom art requests (filterable by status / order)
 *  - Trigger AI upscale / clean (OpenRouter, fal.ai, or Studio Local Lanczos3)
 *  - Download original or enhanced print-ready image
 *  - Update status (`ready_for_print`, `fulfilled`, etc.) and admin notes
 */

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { supabaseAdmin } from '../services/supabase.js';
import { TingeTables } from '../config/tables.js';
import {
  downloadCustomArtFile,
  extractFilePathFromUrl,
  uploadCustomArtFile,
} from '../services/storage.js';
import {
  enhanceCustomArtwork,
  getAvailableAiProviders,
  type AiProviderChoice,
  type EnhanceAction,
} from '../services/aiImage.js';

const router = Router();

const VALID_MATERIALS = new Set(['framed_acp', 'canvas', 'sunboard', 'neon']);

function decodeOptionalAuth(req: Request): { userId?: string; role?: string; email?: string } {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return {};
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      role: string;
    };
    return { userId: decoded.userId, role: decoded.role, email: decoded.email };
  } catch {
    return {};
  }
}

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const { userId, role } = decodeOptionalAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  (req as any).userId = userId;
  next();
};

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image payload. Expected base64 data URL (PNG, JPEG, or WebP).');
  }
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

/**
 * POST /api/custom-art/upload
 * Upload original customer artwork or rendered room mockup to Supabase `custom-art` bucket.
 */
router.post('/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, kind = 'originals', fileName = 'artwork' } = req.body as {
      image?: string;
      kind?: 'originals' | 'mockups';
      fileName?: string;
    };

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Image data URL is required' });
    }

    const folder = kind === 'mockups' ? 'mockups' : 'originals';
    const { buffer, contentType } = parseDataUrl(image);

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image exceeds 20 MB limit' });
    }

    const uploaded = await uploadCustomArtFile({
      fileBuffer: buffer,
      folder,
      fileNameHint: fileName,
      contentType,
    });

    res.status(201).json({
      success: true,
      url: uploaded.publicUrl,
      storagePath: uploaded.storagePath,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/custom-art
 * Save a custom art configuration (material, size, uploaded image, room mockup) before adding to cart.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = decodeOptionalAuth(req);
    const guestSessionId = (req.headers['x-guest-session-id'] as string) || null;
    const {
      material,
      size,
      neonText,
      title,
      unitPrice,
      originalImageUrl,
      originalStoragePath,
      mockupImageUrl,
      mockupStoragePath,
      status = 'in_cart',
    } = req.body;

    if (!material || !VALID_MATERIALS.has(material)) {
      return res.status(400).json({ success: false, message: 'Valid material is required' });
    }
    if (!size || typeof size !== 'string') {
      return res.status(400).json({ success: false, message: 'Size is required' });
    }
    if (!originalImageUrl && !(material === 'neon' && neonText?.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Upload an artwork image (or enter neon text) to continue',
      });
    }

    const numericPrice = Math.max(0, Number(unitPrice) || 0);

    const { data, error } = await supabaseAdmin
      .from(TingeTables.customArtRequests)
      .insert({
        auth_user_id: auth.userId || null,
        guest_session_id: guestSessionId,
        customer_email: auth.email || null,
        material,
        size,
        neon_text: neonText?.trim() || null,
        title: title?.trim() || `Custom ${material.replace('_', ' ')}`,
        unit_price: numericPrice,
        original_image_url: originalImageUrl || null,
        original_storage_path: originalStoragePath || null,
        mockup_image_url: mockupImageUrl || null,
        mockup_storage_path: mockupStoragePath || null,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, request: data });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/custom-art/admin
 * Admin list of custom art requests + available AI providers status.
 */
router.get('/admin', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin
      .from(TingeTables.customArtRequests)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (status && typeof status === 'string' && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      requests: data || [],
      providers: getAvailableAiProviders(),
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/custom-art/:id/enhance
 * Admin: upscale or clean the uploaded artwork via AI (OpenRouter / fal.ai / Studio Local).
 */
router.post('/:id/enhance', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      action = 'upscale_2x',
      provider = 'auto',
      prompt,
    } = req.body as {
      action?: EnhanceAction;
      provider?: AiProviderChoice;
      prompt?: string;
    };

    const { data: row, error: fetchError } = await supabaseAdmin
      .from(TingeTables.customArtRequests)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      return res.status(404).json({ success: false, message: 'Custom art request not found' });
    }

    const sourcePath = row.original_storage_path || (row.original_image_url ? extractFilePathFromUrl(row.original_image_url) : null);
    let sourceBuffer: Buffer;
    let sourceType = 'image/png';

    if (sourcePath) {
      sourceBuffer = await downloadCustomArtFile(sourcePath);
      if (sourcePath.endsWith('.jpg') || sourcePath.endsWith('.jpeg')) sourceType = 'image/jpeg';
      else if (sourcePath.endsWith('.webp')) sourceType = 'image/webp';
    } else if (row.original_image_url) {
      const dl = await fetch(row.original_image_url);
      if (!dl.ok) {
        return res.status(400).json({ success: false, message: 'Could not download source artwork' });
      }
      sourceType = dl.headers.get('content-type') || 'image/jpeg';
      sourceBuffer = Buffer.from(await dl.arrayBuffer());
    } else {
      return res.status(400).json({ success: false, message: 'This request has no uploaded image to enhance (e.g. text-only neon).' });
    }

    await supabaseAdmin
      .from(TingeTables.customArtRequests)
      .update({ ai_status: 'processing', ai_action: action })
      .eq('id', id);

    try {
      const enhanced = await enhanceCustomArtwork({
        imageBuffer: sourceBuffer,
        contentType: sourceType,
        action,
        provider,
        customPrompt: prompt,
      });

      const uploaded = await uploadCustomArtFile({
        fileBuffer: enhanced.buffer,
        folder: 'enhanced',
        fileNameHint: `${row.id}_${action}`,
        contentType: enhanced.contentType,
      });

      const nextStatus =
        row.status === 'draft' || row.status === 'in_cart' || row.status === 'ordered'
          ? 'enhanced'
          : row.status;

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from(TingeTables.customArtRequests)
        .update({
          enhanced_image_url: uploaded.publicUrl,
          enhanced_storage_path: uploaded.storagePath,
          ai_provider: enhanced.providerUsed,
          ai_action: action,
          ai_status: 'ready',
          ai_notes: enhanced.notes,
          status: nextStatus,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      res.json({ success: true, request: updated, dimensions: { width: enhanced.width, height: enhanced.height } });
    } catch (aiErr: any) {
      await supabaseAdmin
        .from(TingeTables.customArtRequests)
        .update({ ai_status: 'failed', ai_notes: aiErr.message })
        .eq('id', id);
      return res.status(502).json({ success: false, message: aiErr.message || 'Enhancement failed' });
    }
  } catch (error: any) {
    next(error);
  }
});

/**
 * PATCH /api/custom-art/:id
 * Admin: update status or notes (`ready_for_print`, `fulfilled`, etc.).
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const patch: Record<string, any> = {};
    if (status) patch.status = status;
    if (typeof admin_notes === 'string') patch.admin_notes = admin_notes;

    const { data, error } = await supabaseAdmin
      .from(TingeTables.customArtRequests)
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, request: data });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/custom-art/:id/download?variant=enhanced|original|mockup
 * Admin: stream file download with Content-Disposition: attachment for print operator / partner.
 */
router.get('/:id/download', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const variant = (req.query.variant as string) || 'enhanced';

    const { data: row, error } = await supabaseAdmin
      .from(TingeTables.customArtRequests)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      return res.status(404).json({ success: false, message: 'Custom art request not found' });
    }

    const chosenUrl =
      variant === 'mockup'
        ? row.mockup_image_url
        : variant === 'original'
          ? row.original_image_url
          : row.enhanced_image_url || row.original_image_url;

    const chosenPath =
      variant === 'mockup'
        ? row.mockup_storage_path
        : variant === 'original'
          ? row.original_storage_path
          : row.enhanced_storage_path || row.original_storage_path;

    let buf: Buffer;
    let ext = 'png';

    if (chosenPath) {
      buf = await downloadCustomArtFile(chosenPath);
      const pathExt = chosenPath.split('.').pop()?.toLowerCase();
      if (pathExt && ['png', 'jpg', 'jpeg', 'webp'].includes(pathExt)) ext = pathExt;
    } else if (chosenUrl) {
      const dl = await fetch(chosenUrl);
      if (!dl.ok) return res.status(502).json({ success: false, message: 'Failed to fetch asset' });
      buf = Buffer.from(await dl.arrayBuffer());
      const ct = dl.headers.get('content-type') || '';
      if (ct.includes('jpeg')) ext = 'jpg';
      else if (ct.includes('webp')) ext = 'webp';
    } else {
      return res.status(404).json({ success: false, message: 'No image available for this variant' });
    }

    const fileBase = (row.order_number || row.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
    res.setHeader('Content-Disposition', `attachment; filename="tinge-${fileBase}-${variant}.${ext}"`);
    res.send(buf);
  } catch (error: any) {
    next(error);
  }
});

export default router;
