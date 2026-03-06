/**
 * Category Routes
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { cache, cacheKeys } from '../services/redis.js';
import { uploadCategoryImage, extractFilePathFromUrl, deleteFile } from '../services/storage.js';

const router = Router();

// Helper function to transform database category to API format
const transformCategory = (dbCategory: any) => ({
  id: dbCategory.id,
  name: dbCategory.name,
  slug: dbCategory.slug,
  imageUrl: dbCategory.image_url || dbCategory.imageUrl, // Support both formats
});

// Get all categories (public) - with Redis caching
router.get('/', async (req, res, next) => {
  try {
    // Try to get from cache first
    const cacheKey = cacheKeys.categories;
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      // Transform cached data if needed (in case it's in snake_case)
      const transformed = Array.isArray(cachedData) 
        ? cachedData.map(transformCategory)
        : cachedData;
      return res.json(transformed);
    }

    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    // Transform to camelCase for frontend
    const transformed = data.map(transformCategory);
    
    // Store transformed data in cache (1 hour TTL)
    await cache.set(cacheKey, transformed, 3600);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Get category by slug (public) - with Redis caching
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cacheKey = cacheKeys.category(slug);
    
    // Try to get from cache first
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(transformCategory(cachedData));
    }

    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    
    // Transform to camelCase
    const transformed = transformCategory(data);
    
    // Store transformed data in cache (1 hour TTL)
    await cache.set(cacheKey, transformed, 3600);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Create category (admin only) - with image upload support
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { name, slug, imageUrl, imageFile } = req.body;
    
    let finalImageUrl = imageUrl;
    
    // If imageFile is provided (base64 or file data), upload to Supabase Storage
    if (imageFile && !imageUrl) {
      try {
        // Handle base64 image data
        if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
          const base64Data = imageFile.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          finalImageUrl = await uploadCategoryImage(buffer, slug);
        } else {
          // Handle File object (if sent as multipart/form-data)
          // Note: For File objects, you may need to use multer middleware
          throw new Error('File upload via multipart/form-data not yet implemented. Use base64 image data.');
        }
      } catch (uploadError: any) {
        return res.status(400).json({ 
          error: `Failed to upload image: ${uploadError.message}` 
        });
      }
    }
    
    // Prepare category data for database (snake_case)
    const categoryData = {
      name,
      slug,
      image_url: finalImageUrl,
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform to camelCase for response
    const transformed = transformCategory(data);
    
    // Sync cache: Invalidate all categories list and cache the new category
    await cache.del(cacheKeys.categories);
    if (transformed.slug) {
      await cache.set(cacheKeys.category(transformed.slug), transformed, 3600);
    }
    if (transformed.id) {
      await cache.set(cacheKeys.categoryById(transformed.id), transformed, 3600);
    }
    
    res.status(201).json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Update category (admin only) - with image upload support
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, imageUrl, imageFile } = req.body;
    
    // Get old category data to know which cache keys to invalidate and which image to delete
    const { data: oldCategory } = await supabase
      .from('categories')
      .select('slug, image_url')
      .eq('id', id)
      .single();
    
    let finalImageUrl = imageUrl || oldCategory?.image_url;
    
    // If new image file is provided, upload it
    if (imageFile && !imageUrl) {
      try {
        // Handle base64 image data
        if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
          const base64Data = imageFile.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          finalImageUrl = await uploadCategoryImage(buffer, slug || oldCategory?.slug || id);
          
          // Delete old image from storage if it was in Supabase Storage
          if (oldCategory?.image_url) {
            const oldFilePath = extractFilePathFromUrl(oldCategory.image_url);
            if (oldFilePath) {
              try {
                await deleteFile(oldFilePath);
              } catch (deleteError) {
                // Log but don't fail the update if deletion fails
                console.warn('Failed to delete old image:', deleteError);
              }
            }
          }
        } else {
          throw new Error('File upload via multipart/form-data not yet implemented. Use base64 image data.');
        }
      } catch (uploadError: any) {
        return res.status(400).json({ 
          error: `Failed to upload image: ${uploadError.message}` 
        });
      }
    }
    
    // Prepare update data for database (snake_case)
    const categoryData: any = {};
    if (name) categoryData.name = name;
    if (slug) categoryData.slug = slug;
    if (finalImageUrl) categoryData.image_url = finalImageUrl;
    
    // Update in database
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform to camelCase
    const transformed = transformCategory(data);
    
    // Sync cache: Invalidate old cache entries and update with new data
    await cache.del(cacheKeys.categories); // Invalidate all categories list
    
    // Invalidate old slug cache if slug changed
    if (oldCategory?.slug && oldCategory.slug !== transformed.slug) {
      await cache.del(cacheKeys.category(oldCategory.slug));
    }
    
    // Update cache with new data
    if (transformed.slug) {
      await cache.set(cacheKeys.category(transformed.slug), transformed, 3600);
    }
    await cache.set(cacheKeys.categoryById(id), transformed, 3600);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Delete category (admin only) - with image cleanup
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    
    // Get category first to know which cache keys to invalidate and which image to delete
    const { data: category } = await supabase
      .from('categories')
      .select('slug, image_url')
      .eq('id', id)
      .single();
    
    // Delete from database
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Delete image from storage if it's in Supabase Storage
    if (category?.image_url) {
      const filePath = extractFilePathFromUrl(category.image_url);
      if (filePath) {
        try {
          await deleteFile(filePath);
        } catch (deleteError) {
          // Log but don't fail the delete if image deletion fails
          console.warn('Failed to delete category image from storage:', deleteError);
        }
      }
    }
    
    // Invalidate all category caches
    await cache.del(cacheKeys.categories);
    if (category?.slug) {
      await cache.del(cacheKeys.category(category.slug));
    }
    await cache.del(cacheKeys.categoryById(id));
    
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;
