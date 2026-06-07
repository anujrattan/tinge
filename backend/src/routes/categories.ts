/**
 * Category Routes
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { uploadCategoryImage, extractFilePathFromUrl, deleteFile } from '../services/storage.js';
import { cache, cacheKeys } from '../services/redis.js';

const CACHE_TTL = 3600; // 1 hour

// Helper function to upsert category in cache arrays
async function upsertCategoryInCacheArrays(category: any) {
  try {
    // Upsert in categories:all cache (admin)
    const allCategories = await cache.getJSON<any[]>(cacheKeys.categories);
    if (allCategories) {
      const index = allCategories.findIndex((c: any) => c.id === category.id);
      if (index >= 0) {
        allCategories[index] = category;
      } else {
        allCategories.push(category);
        // Sort by name to maintain order
        allCategories.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
      await cache.setJSON(cacheKeys.categories, allCategories, CACHE_TTL);
    }

    // Upsert in categories:active cache (public) - only if active
    if (category.isActive !== false) {
      const activeCategories = await cache.getJSON<any[]>(cacheKeys.categoriesActive);
      if (activeCategories) {
        const index = activeCategories.findIndex((c: any) => c.id === category.id);
        if (index >= 0) {
          activeCategories[index] = category;
        } else {
          activeCategories.push(category);
          // Sort by name to maintain order
          activeCategories.sort((a: any, b: any) => a.name.localeCompare(b.name));
        }
        await cache.setJSON(cacheKeys.categoriesActive, activeCategories, CACHE_TTL);
      }
    } else {
      // If category is now inactive, remove from active cache
      await removeCategoryFromActiveCache(category.id);
    }

    // Upsert individual category cache
    if (category.slug) {
      await cache.setJSON(cacheKeys.category(category.slug), category, CACHE_TTL);
    }
  } catch (error) {
    console.error('Error upserting category in cache arrays:', error);
    // Non-fatal - continue even if cache update fails
  }
}

// Helper function to remove category from cache arrays
async function removeCategoryFromCacheArrays(categoryId: string, categorySlug?: string) {
  try {
    // Remove from categories:all cache
    const allCategories = await cache.getJSON<any[]>(cacheKeys.categories);
    if (allCategories) {
      const filtered = allCategories.filter((c: any) => c.id !== categoryId);
      await cache.setJSON(cacheKeys.categories, filtered, CACHE_TTL);
    }

    // Remove from categories:active cache
    await removeCategoryFromActiveCache(categoryId);

    // Remove individual category cache
    if (categorySlug) {
      await cache.del(cacheKeys.category(categorySlug));
    }
  } catch (error) {
    console.error('Error removing category from cache arrays:', error);
    // Non-fatal - continue even if cache update fails
  }
}

// Helper function to remove category from active cache only
async function removeCategoryFromActiveCache(categoryId: string) {
  try {
    const activeCategories = await cache.getJSON<any[]>(cacheKeys.categoriesActive);
    if (activeCategories) {
      const filtered = activeCategories.filter((c: any) => c.id !== categoryId);
      await cache.setJSON(cacheKeys.categoriesActive, filtered, CACHE_TTL);
    }
  } catch (error) {
    console.error('Error removing category from active cache:', error);
    // Non-fatal - continue even if cache update fails
  }
}

const router = Router();

// Helper function to transform database category to API format
const transformCategory = (dbCategory: any) => ({
  id: dbCategory.id,
  name: dbCategory.name,
  slug: dbCategory.slug,
  imageUrl: dbCategory.image_url || dbCategory.imageUrl,
  isActive: dbCategory.is_active !== undefined ? dbCategory.is_active : true,
  complementSlugs: Array.isArray(dbCategory.complement_slugs) ? dbCategory.complement_slugs : [],
  product_type: dbCategory.product_type === 'poster' ? 'poster' : 'apparel',
});

// Get all categories (public) - only returns active categories
router.get('/', async (req, res, next) => {
  try {
    // Try to get from cache first
    const cacheKey = cacheKeys.categoriesActive;
    const cachedData = await cache.getJSON<any[]>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return res.json(cachedData);
    }
    
    console.log(`📦 Cache miss for ${cacheKey}, fetching from database`);
    
    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    const transformed = data.map(transformCategory);
    
    // Store in cache
    await cache.setJSON(cacheKey, transformed, CACHE_TTL);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Get all categories including inactive ones (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    // Try to get from cache first
    const cacheKey = cacheKeys.categories;
    const cachedData = await cache.getJSON<any[]>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return res.json(cachedData);
    }
    
    console.log(`📦 Cache miss for ${cacheKey}, fetching from database`);
    
    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    const transformed = data.map(transformCategory);
    
    // Store in cache
    await cache.setJSON(cacheKey, transformed, CACHE_TTL);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Get category by slug (public) - only returns if active
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // Try to get from cache first
    const cacheKey = cacheKeys.category(slug);
    const cachedData = await cache.getJSON<any>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return res.json(cachedData);
    }
    
    console.log(`📦 Cache miss for ${cacheKey}, fetching from database`);
    
    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    
    const transformed = transformCategory(data);
    
    // Store in cache
    await cache.setJSON(cacheKey, transformed, CACHE_TTL);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Create category (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { name, slug, imageUrl, imageFile, complementSlugs, product_type } = req.body;
    const resolvedProductType = product_type === 'poster' ? 'poster' : 'apparel';
    
    let finalImageUrl: string;
    
    // If imageFile is provided (base64 data URL), upload to Supabase Storage
    if (imageFile && !imageUrl) {
      if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
        // Extract content type and base64 data
        const matches = imageFile.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ 
            error: 'Invalid image file format. Expected base64 image data.' 
          });
        }
        
        const contentType = `image/${matches[1]}`;
        const base64Data = matches[2];
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(base64Data, 'base64');
        
        // Upload to Supabase Storage
        finalImageUrl = await uploadCategoryImage(fileBuffer, slug, contentType);
      } else {
        return res.status(400).json({ 
          error: 'Invalid image file format. Please provide a valid image URL or base64 image data.' 
        });
      }
    } else if (imageUrl) {
      // Use provided URL directly
      finalImageUrl = imageUrl;
    } else {
      return res.status(400).json({ 
        error: 'Image URL or image file is required. Please provide either an image URL or upload an image file.' 
      });
    }
    
    const categoryData = {
      name,
      slug,
      image_url: finalImageUrl,
      is_active: true, // New categories are active by default
      complement_slugs: Array.isArray(complementSlugs) ? complementSlugs : [],
      product_type: resolvedProductType,
    };
    
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();
    
    if (error) throw error;
    
    const transformed = transformCategory(data);
    
    // Upsert category in cache arrays
    await upsertCategoryInCacheArrays(transformed);
    
    res.status(201).json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, imageUrl, imageFile, complementSlugs, product_type } = req.body;
    const resolvedProductType = product_type === 'poster' ? 'poster' : 'apparel';
    
    // Get existing category to check for old image
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('image_url, slug')
      .eq('id', id)
      .single();
    
    const categoryData: any = {};
    if (name) categoryData.name = name;
    if (slug) categoryData.slug = slug;
    if (Array.isArray(complementSlugs)) categoryData.complement_slugs = complementSlugs;
    if (product_type !== undefined) categoryData.product_type = resolvedProductType;
    
    // Handle image URL or file upload
    if (imageFile && !imageUrl) {
      if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
        // Extract content type and base64 data
        const matches = imageFile.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ 
            error: 'Invalid image file format. Expected base64 image data.' 
          });
        }
        
        const contentType = `image/${matches[1]}`;
        const base64Data = matches[2];
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(base64Data, 'base64');
        
        // Upload new image to Supabase Storage
        const newImageUrl = await uploadCategoryImage(fileBuffer, slug || existingCategory?.slug || id, contentType);
        categoryData.image_url = newImageUrl;
        
        // Delete old image from storage if it exists and is from Supabase Storage
        if (existingCategory?.image_url) {
          const oldFilePath = extractFilePathFromUrl(existingCategory.image_url);
          if (oldFilePath) {
            try {
              await deleteFile(oldFilePath);
            } catch (deleteError) {
              // Log but don't fail the update if deletion fails
              console.warn('Failed to delete old image from storage:', deleteError);
            }
          }
        }
      }
    } else if (imageUrl) {
      categoryData.image_url = imageUrl;
      
      // Delete old image from storage if it exists and is from Supabase Storage
      // (only if the new URL is different)
      if (existingCategory?.image_url && existingCategory.image_url !== imageUrl) {
        const oldFilePath = extractFilePathFromUrl(existingCategory.image_url);
        if (oldFilePath) {
          try {
            await deleteFile(oldFilePath);
          } catch (deleteError) {
            // Log but don't fail the update if deletion fails
            console.warn('Failed to delete old image from storage:', deleteError);
          }
        }
      }
    }
    // If neither is provided, don't update the image
    
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    const transformed = transformCategory(data);
    
    // Get old category slug for cache cleanup if slug changed
    const oldSlug = existingCategory?.slug;
    const newSlug = transformed.slug;
    
    // Upsert category in cache arrays
    await upsertCategoryInCacheArrays(transformed);
    
    // If slug changed, remove old individual category cache
    if (oldSlug && newSlug && oldSlug !== newSlug) {
      await cache.del(cacheKeys.category(oldSlug));
    }
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Toggle category active status (admin only)
router.patch('/:id/toggle-active', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    
    // Get current status
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('is_active')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Toggle the status
    const newStatus = !category.is_active;
    
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: newStatus })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    const transformed = transformCategory(data);
    
    // Upsert category in cache arrays (will handle active/inactive logic)
    await upsertCategoryInCacheArrays(transformed);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Prevent delete if category has products (would orphan them)
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) throw countError;
    if (count != null && count > 0) {
      return res.status(400).json({
        error: `Cannot delete category: it has ${count} product(s). Move or delete the products first.`,
      });
    }

    // Get category data (image URL and slug) before deleting
    const { data: category } = await supabase
      .from('categories')
      .select('image_url, slug')
      .eq('id', id)
      .single();

    // Delete from database
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Delete image from storage if it exists and is from Supabase Storage
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
    
    // Get category slug before deletion for cache cleanup
    const categorySlug = category?.slug;
    
    // Remove category from cache arrays
    await removeCategoryFromCacheArrays(id, categorySlug);
    
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

