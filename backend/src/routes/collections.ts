/**
 * Collection Routes
 *
 * Collections are merchandising groupings like "The Streetwear Edit",
 * separate from technical product categories.
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { uploadCategoryImage, extractFilePathFromUrl, deleteFile } from '../services/storage.js';

const router = Router();

// Helper: transform DB row → API format
const transformCollection = (dbCollection: any) => ({
  id: dbCollection.id,
  name: dbCollection.name,
  slug: dbCollection.slug,
  description: dbCollection.description || '',
  imageUrl: dbCollection.image_url || dbCollection.imageUrl || '',
  isActive: dbCollection.is_active !== undefined ? dbCollection.is_active : true,
  sortOrder: typeof dbCollection.sort_order === 'number' ? dbCollection.sort_order : 0,
  createdAt: dbCollection.created_at,
});

// Public: list active collections
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformed = (data || []).map(transformCollection);
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Admin: list all collections (active + inactive)
router.get('/admin/all', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const transformed = (data || []).map(transformCollection);
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Public: get collection by slug (only if active)
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    const transformed = transformCollection(data);
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Admin: create collection
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { name, slug, description, sortOrder, imageUrl, imageFile } = req.body;

    let finalImageUrl: string | undefined;

    // If imageFile is provided (base64 data URL), upload to Supabase Storage
    if (imageFile && !imageUrl) {
      if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
        const matches = imageFile.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({
            error: 'Invalid image file format. Expected base64 image data.',
          });
        }

        const contentType = `image/${matches[1]}`;
        const base64Data = matches[2];
        const fileBuffer = Buffer.from(base64Data, 'base64');

        // Reuse category image uploader (same bucket)
        finalImageUrl = await uploadCategoryImage(fileBuffer, slug, contentType);
      } else {
        return res.status(400).json({
          error: 'Invalid image file format. Please provide a valid image URL or base64 image data.',
        });
      }
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
    }

    const insertData: any = {
      name,
      slug,
      description: description || null,
      image_url: finalImageUrl || null,
      is_active: true,
    };
    if (typeof sortOrder === 'number') {
      insertData.sort_order = sortOrder;
    }

    const { data, error } = await supabase
      .from('collections')
      .insert([insertData])
      .select('*')
      .single();

    if (error) throw error;

    const transformed = transformCollection(data);
    res.status(201).json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Admin: update collection
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, sortOrder, imageUrl, imageFile } = req.body;

    // Fetch existing for image cleanup if needed
    const { data: existing } = await supabase
      .from('collections')
      .select('image_url, slug')
      .eq('id', id)
      .single();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (typeof description === 'string') updateData.description = description;
    if (typeof sortOrder === 'number') updateData.sort_order = sortOrder;

    // Handle image
    if (imageFile && !imageUrl) {
      if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
        const matches = imageFile.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({
            error: 'Invalid image file format. Expected base64 image data.',
          });
        }

        const contentType = `image/${matches[1]}`;
        const base64Data = matches[2];
        const fileBuffer = Buffer.from(base64Data, 'base64');

        const newImageUrl = await uploadCategoryImage(
          fileBuffer,
          slug || existing?.slug || id,
          contentType,
        );
        updateData.image_url = newImageUrl;

        if (existing?.image_url) {
          const oldFilePath = extractFilePathFromUrl(existing.image_url);
          if (oldFilePath) {
            try {
              await deleteFile(oldFilePath);
            } catch (deleteError) {
              console.warn('Failed to delete old collection image from storage:', deleteError);
            }
          }
        }
      }
    } else if (imageUrl) {
      updateData.image_url = imageUrl;

      if (existing?.image_url && existing.image_url !== imageUrl) {
        const oldFilePath = extractFilePathFromUrl(existing.image_url);
        if (oldFilePath) {
          try {
            await deleteFile(oldFilePath);
          } catch (deleteError) {
            console.warn('Failed to delete old collection image from storage:', deleteError);
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const transformed = transformCollection(data);
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Admin: toggle active status
router.patch('/:id/toggle-active', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const newStatus = !collection.is_active;

    const { data, error } = await supabase
      .from('collections')
      .update({ is_active: newStatus })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const transformed = transformCollection(data);
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Admin: delete collection (unlink products, then delete)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Unlink products (set collection_id to null)
    const { error: unlinkError } = await supabase
      .from('products')
      .update({ collection_id: null })
      .eq('collection_id', id);

    if (unlinkError) throw unlinkError;

    // Get collection image URL before deleting
    const { data: collection } = await supabase
      .from('collections')
      .select('image_url')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (collection?.image_url) {
      const filePath = extractFilePathFromUrl(collection.image_url);
      if (filePath) {
        try {
          await deleteFile(filePath);
        } catch (deleteError) {
          console.warn('Failed to delete collection image from storage:', deleteError);
        }
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

