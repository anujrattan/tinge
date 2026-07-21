/**
 * Product Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { supabase, supabaseAdmin } from '../services/supabase.js';
import { uploadProductImage, extractFilePathFromUrl, deleteFile } from '../services/storage.js';
import { cache, cacheKeys } from '../services/redis.js';
import { createPricingValidationSnapshot, pricingPayloadMatches, PricingValidationPayload } from '../utils/pricing.js';
import { normalizeSizeList } from '../utils/sizeNormalization.js';
import {
  buildVariantsPayload,
  extractVariantsFromDb,
  parseSizePricesMap,
  resolveListingSellingPrice,
} from '../utils/variantPricing.js';

const router = Router();

// Cache TTL in seconds
// Set to 6 hours (21600 seconds) since we're doing upserts on every create/update/delete
// This means cache will only refresh from DB ~4 times per day on cache misses
// But since we upsert on writes, cache stays in sync regardless of TTL
const CACHE_TTL = 6 * 60 * 60; // 6 hours

const isValidPricingValidationPayload = (value: any): value is PricingValidationPayload => {
  return (
    value &&
    typeof value === 'object' &&
    Number.isFinite(Number(value.suggested_price)) &&
    Number.isFinite(Number(value.discounted_price)) &&
    Number.isFinite(Number(value.final_price))
  );
};

// Helper function to transform database product to API format
const transformProduct = (dbProduct: any, category?: any) => {
  // Handle selling_price - check for null/undefined explicitly
  let sellingPrice = 0;
  
  if (dbProduct.selling_price != null && dbProduct.selling_price !== '' && dbProduct.selling_price !== 0) {
    const parsed = typeof dbProduct.selling_price === 'string' 
      ? parseFloat(dbProduct.selling_price) 
      : Number(dbProduct.selling_price);
    if (!isNaN(parsed) && parsed > 0) {
      sellingPrice = parsed;
    }
  } else if (dbProduct.price != null && dbProduct.price !== '' && dbProduct.price !== 0) {
    const parsed = typeof dbProduct.price === 'string' 
      ? parseFloat(dbProduct.price) 
      : Number(dbProduct.price);
    if (!isNaN(parsed) && parsed > 0) {
      sellingPrice = parsed;
    }
  }
  
  // Validate parsed price (handle NaN)
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    sellingPrice = 0;
  }
  const discountPercentage = dbProduct.discount_percentage != null && dbProduct.discount_percentage > 0
    ? parseFloat(dbProduct.discount_percentage)
    : null;
  
  const onSale = dbProduct.on_sale === true;
  const saleDiscountPercentage = onSale && dbProduct.sale_discount_percentage != null && dbProduct.sale_discount_percentage > 0
    ? parseFloat(dbProduct.sale_discount_percentage)
    : null;
  
  // Calculate final price with multiplicative stacking
  let finalPrice = sellingPrice;
  if (discountPercentage != null && discountPercentage > 0) {
    finalPrice = finalPrice * (1 - discountPercentage / 100);
  }
  if (saleDiscountPercentage != null && saleDiscountPercentage > 0) {
    finalPrice = finalPrice * (1 - saleDiscountPercentage / 100);
  }
  
  const hasAnyDiscount = (discountPercentage != null && discountPercentage > 0) || (saleDiscountPercentage != null && saleDiscountPercentage > 0);
  const totalSavings = sellingPrice - finalPrice;
  
  const categorySlug = category?.slug || dbProduct.category || '';
  
  return {
    id: dbProduct.id,
    collection_id: dbProduct.collection_id || null,
    category_id: dbProduct.category_id,
    title: dbProduct.title || dbProduct.name,
    description: dbProduct.description,
    selling_price: sellingPrice,
    discount_percentage: discountPercentage || undefined,
    on_sale: onSale || undefined,
    sale_discount_percentage: saleDiscountPercentage || undefined,
    usp_tag: dbProduct.usp_tag || undefined,
    main_image_url: dbProduct.main_image_url || dbProduct.imageUrl || dbProduct.image_url,
    mockup_images: dbProduct.mockup_images || [],
    mockup_video_url: dbProduct.mockup_video_url || undefined,
    rating: dbProduct.rating || undefined,
    rating_count: dbProduct.rating_count || 0,
    review_count: dbProduct.rating_count || dbProduct.review_count || dbProduct.reviewCount || 0,
    variants: extractVariantsFromDb(dbProduct.variants),
    color: dbProduct.color || undefined,
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at,
    // Legacy fields for backward compatibility
    name: dbProduct.title || dbProduct.name,
    price: finalPrice,
    originalPrice: hasAnyDiscount ? sellingPrice : undefined,
    imageUrl: dbProduct.main_image_url || dbProduct.imageUrl || dbProduct.image_url,
    category: categorySlug,
    tags: dbProduct.usp_tag ? [dbProduct.usp_tag] : [],
    reviewCount: dbProduct.rating_count || dbProduct.review_count || dbProduct.reviewCount || 0,
    discount: hasAnyDiscount ? `Save $${totalSavings.toFixed(0)}` : undefined,
    vendor_base_cost: dbProduct.vendor_base_cost || undefined,
    vendor_shipping_cost: dbProduct.vendor_shipping_cost || undefined,
    target_margin_percent: dbProduct.target_margin_percent || undefined,
    fulfillment_partner: dbProduct.fulfillment_partner || undefined,
    partner_product_id: dbProduct.partner_product_id || undefined,
    partner_variants: Array.isArray(dbProduct.partner_variants)
      ? dbProduct.partner_variants
      : [],
    size_chart_profile: dbProduct.size_chart_profile || undefined,
    design_family: dbProduct.design_family || undefined,
    is_active: dbProduct.is_active !== false,
    is_featured: dbProduct.is_featured === true,
    category_name: category?.name || dbProduct.category_name || undefined,
    category_product_type:
      category?.product_type === 'poster' ? 'poster' : 'apparel',
  };
};

// Helper function to upsert product in cache arrays
async function upsertProductInCacheArrays(product: any) {
  try {
    // Upsert in products:all cache
    const allProducts = await cache.getJSON<any[]>(cacheKeys.products);
    if (allProducts) {
      const index = allProducts.findIndex((p: any) => p.id === product.id);
      if (index >= 0) {
        allProducts[index] = product;
      } else {
        allProducts.unshift(product); // Add to beginning
      }
      await cache.setJSON(cacheKeys.products, allProducts, CACHE_TTL);
    }

    // Upsert in category-specific cache if category slug exists
    const categorySlug = product.category;
    if (categorySlug) {
      const categoryKey = cacheKeys.productsByCategory(categorySlug);
      const categoryProducts = await cache.getJSON<any[]>(categoryKey);
      if (categoryProducts) {
        const index = categoryProducts.findIndex((p: any) => p.id === product.id);
        if (index >= 0) {
          categoryProducts[index] = product;
        } else {
          categoryProducts.unshift(product);
        }
        await cache.setJSON(categoryKey, categoryProducts, CACHE_TTL);
      }
    }
  } catch (error) {
    console.error('Error upserting product in cache arrays:', error);
    // Non-fatal - continue even if cache update fails
  }
}

// Helper function to remove product from cache arrays
async function removeProductFromCacheArrays(productId: string, categorySlug?: string) {
  try {
    // Remove from products:all cache
    const allProducts = await cache.getJSON<any[]>(cacheKeys.products);
    if (allProducts) {
      const filtered = allProducts.filter((p: any) => p.id !== productId);
      await cache.setJSON(cacheKeys.products, filtered, CACHE_TTL);
    }

    // Remove from category-specific cache if category slug exists
    if (categorySlug) {
      const categoryKey = cacheKeys.productsByCategory(categorySlug);
      const categoryProducts = await cache.getJSON<any[]>(categoryKey);
      if (categoryProducts) {
        const filtered = categoryProducts.filter((p: any) => p.id !== productId);
        await cache.setJSON(categoryKey, filtered, CACHE_TTL);
      }
    }
  } catch (error) {
    console.error('Error removing product from cache arrays:', error);
    // Non-fatal - continue even if cache update fails
  }
}

// Get all products (public) - with caching
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, collection } = req.query;
    
    // NOTE: For now, collection-based queries are not cached to keep logic simple.
    // We only use the existing category-based cache; when a collection filter is present,
    // we bypass the cache and hit the database directly.
    
    // Cache miss - fetch from database
    let query = supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name,
          is_active,
          product_type
        )
      `);
    
    if (category) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category as string);
      if (isUUID) {
        query = query.eq('category_id', category);
      } else {
        // Look up category by slug (only active categories)
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .eq('is_active', true)
          .single();
        if (categoryData) {
          query = query.eq('category_id', categoryData.id);
        } else {
          // Category doesn't exist or is inactive, return empty array
          return res.json([]);
        }
      }
    }

    // Filter by collection if requested (collection slug or UUID)
    if (collection) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        collection as string,
      );
      if (isUUID) {
        query = query.eq('collection_id', collection);
      } else {
        const { data: collectionData } = await supabase
          .from('collections')
          .select('id')
          .eq('slug', collection)
          .eq('is_active', true)
          .single();
        if (collectionData) {
          query = query.eq('collection_id', collectionData.id);
        } else {
          // Collection doesn't exist or is inactive, return empty array
          return res.json([]);
        }
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform products with category data, filter out inactive categories and draft products
    const transformed = (data || [])
      .filter((product: any) => {
        return product.categories?.is_active !== false && product.is_active !== false;
      })
      .map((product: any) => {
        const category = product.categories;
        delete product.categories;
        
        // Extract variants from JSONB
        const variants = extractVariantsFromDb(product.variants);
        product.variants = variants;
        
        return transformProduct(product, category);
      });
    
    // Note: list endpoint is currently not cached (we rely on per-product
    // caching and category caches elsewhere). This avoids stale data and
    // simplifies collection-based queries.
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Search products with full-text search
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, category, minPrice, maxPrice, limit = 20, offset = 0 } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json({ results: [], total: 0 });
    }
    
    const searchTerm = q.trim();
    const searchLimit = parseInt(limit as string);
    const searchOffset = parseInt(offset as string);
    
    // Build the query with full-text search
    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug,
          product_type
        )
      `, { count: 'exact' });
    
    // Full-text search on title and description
    // Using ilike for case-insensitive partial matching (good for short searches)
    // For better performance with large datasets, you'd use PostgreSQL full-text search
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    
    // Apply filters
    if (category && typeof category === 'string') {
      query = query.eq('category_id', category);
    }
    
    if (minPrice && typeof minPrice === 'string') {
      query = query.gte('selling_price', parseFloat(minPrice));
    }
    
    if (maxPrice && typeof maxPrice === 'string') {
      query = query.lte('selling_price', parseFloat(maxPrice));
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(searchOffset, searchOffset + searchLimit - 1);
    
    const { data: products, error, count } = await query;
    
    if (error) throw error;
    
    const transformed = (products || []).map(p => transformProduct(p, p.categories));
    
    res.json({
      results: transformed,
      total: count || 0,
      query: searchTerm,
      page: Math.floor(searchOffset / searchLimit) + 1,
      limit: searchLimit
    });
  } catch (error: any) {
    console.error('Error searching products:', error);
    next(error);
  }
});

// Get best sellers (based on revenue from last 30 days)
router.get('/best-sellers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    
    // Try to get from cache first
    const cacheKey = 'orders:last30days';
    let ordersData = await cache.get(cacheKey);
    
    if (!ordersData) {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Fetch orders from last 30 days with order items
      const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          created_at,
          order_items (
            product_id,
            quantity,
            unit_price
          )
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'delivered'); // Only count delivered orders
      
      if (error) throw error;
      
      ordersData = orders || [];
      
      // Cache for 24 hours (86400 seconds)
      await cache.set(cacheKey, JSON.stringify(ordersData), 86400);
    } else {
      ordersData = JSON.parse(ordersData as string);
    }
    
    // Calculate revenue per product
    const productRevenue: Record<string, number> = {};
    
    for (const order of ordersData as any[]) {
      if (order.order_items && Array.isArray(order.order_items)) {
        for (const item of order.order_items) {
          const productId = item.product_id;
          const revenue = item.quantity * item.unit_price;
          
          if (!productRevenue[productId]) {
            productRevenue[productId] = 0;
          }
          productRevenue[productId] += revenue;
        }
      }
    }
    
    // Sort products by revenue and get top products
    const sortedProducts = Object.entries(productRevenue)
      .sort(([, revenueA], [, revenueB]) => revenueB - revenueA)
      .slice(0, limit)
      .map(([productId]) => productId);
    
    if (sortedProducts.length === 0) {
      // No sales data yet, return live products as fallback (exclude drafts).
      // Order by updated_at so listings published from draft surface near the top.
      console.log('No sales data for best sellers, returning newest live products as fallback');
      const { data: fallbackProducts, error: fallbackError } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          categories:category_id (
            id,
            name,
            slug,
            product_type
          )
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (fallbackError) throw fallbackError;
      
      const transformed = (fallbackProducts || [])
        .filter((p: any) => p.categories?.is_active !== false)
        .map((p) => {
          const transformed = transformProduct(p, p.categories);
          console.log(`Product: ${transformed.title}, selling_price: ${transformed.selling_price}, price: ${transformed.price}`);
          return transformed;
        });
      return res.json(transformed);
    }
    
    // Fetch full product details for best sellers
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug,
          product_type
        )
      `)
      .in('id', sortedProducts)
      .eq('is_active', true);
    
    if (productsError) throw productsError;
    
    // Sort products by revenue ranking
    const sortedProductDetails = sortedProducts
      .map((id) => products?.find((p) => p.id === id))
      .filter((p): p is (typeof products)[number] => Boolean(p && p.categories?.is_active !== false))
      .map((p) => {
        const transformed = transformProduct(p, p.categories);
        console.log(`Best Seller: ${transformed.title}, selling_price: ${transformed.selling_price}, price: ${transformed.price}`);
        return transformed;
      });
    
    res.json(sortedProductDetails);
  } catch (error: any) {
    console.error('Error fetching best sellers:', error);
    next(error);
  }
});

// Get featured art (live products with is_featured; newest listings first)
router.get('/featured', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 200;

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug,
          product_type
        )
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const transformed = (products || [])
      .filter((p: any) => p.categories?.is_active !== false)
      .map((p) => transformProduct(p, p.categories));

    res.json(transformed);
  } catch (error: any) {
    console.error('Error fetching featured products:', error);
    next(error);
  }
});

// Get new arrivals (live products only; order by updated_at so recently published drafts appear)
router.get('/new-arrivals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          name,
          slug,
          product_type
        )
      `)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    const transformed = (products || [])
      .filter((p: any) => p.categories?.is_active !== false)
      .map((p) => {
        const transformed = transformProduct(p, p.categories);
        console.log(`New Arrival: ${transformed.title}, selling_price: ${transformed.selling_price}, price: ${transformed.price}`);
        return transformed;
      });
    
    res.json(transformed);
  } catch (error: any) {
    console.error('Error fetching new arrivals:', error);
    next(error);
  }
});

// Get distinct design family values for admin autocomplete
router.get(
  '/design-families',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const limitRaw = parseInt(String(req.query.limit || '10'), 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

      let query = supabaseAdmin
        .from('products')
        .select('design_family')
        .not('design_family', 'is', null)
        .neq('design_family', '');

      if (q) {
        query = query.ilike('design_family', `%${q}%`);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const seen = new Set<string>();
      const families: string[] = [];
      for (const row of data || []) {
        const value = typeof row.design_family === 'string' ? row.design_family.trim() : '';
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        families.push(value);
        if (families.length >= limit) break;
      }

      res.json({ families });
    } catch (error: any) {
      next(error);
    }
  },
);

// Admin: list all products including drafts (is_active = false)
router.get(
  '/admin-list',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          categories:category_id (
            id,
            slug,
            name,
            is_active,
            product_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed = (data || []).map((product: any) => {
        const category = product.categories;
        delete product.categories;
        const variants = extractVariantsFromDb(product.variants);
        product.variants = variants;
        return {
          ...transformProduct(product, category),
          is_active: product.is_active !== false,
        };
      });

      res.json(transformed);
    } catch (error: any) {
      next(error);
    }
  },
);

// Admin: bulk import products as drafts from Printrove (is_active = false, no pricing validation)
router.post(
  '/bulk-draft-import',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body as {
        items: Array<{
          title: string;
          color?: string;
          sizes?: string[];
          main_image_url?: string;
          mockup_images?: string[];
          partner_product_id?: string;
          partner_variants?: any[];
          fulfillment_partner?: string;
          category_id?: string;
        }>;
      };

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array is required and must not be empty.' });
      }

      const created: any[] = [];
      const failed: Array<{ title: string; reason: string }> = [];

      for (const item of items) {
        try {
          if (!item.title?.trim()) {
            failed.push({ title: item.title || '(no title)', reason: 'title is required' });
            continue;
          }

          const sizesArray = normalizeSizeList(
            Array.isArray(item.sizes) ? item.sizes : [],
          );

          const productData: any = {
            title: item.title.trim(),
            description: '',
            selling_price: 0,
            main_image_url: item.main_image_url?.trim() || '',
            variants: { sizes: sizesArray },
            is_active: false,
            color: item.color?.trim() || null,
            fulfillment_partner: item.fulfillment_partner?.trim() || 'Printrove',
            partner_product_id: item.partner_product_id?.trim() || null,
            partner_variants: Array.isArray(item.partner_variants) ? item.partner_variants : [],
            mockup_images: Array.isArray(item.mockup_images) ? item.mockup_images : [],
          };

          // Use first category if none provided — draft can be re-assigned later
          if (item.category_id) {
            productData.category_id = item.category_id;
          } else {
            const { data: firstCategory } = await supabaseAdmin
              .from('categories')
              .select('id')
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
            if (!firstCategory) {
              failed.push({ title: item.title, reason: 'No active category found to assign to draft' });
              continue;
            }
            productData.category_id = firstCategory.id;
          }

          const pid = item.partner_product_id?.trim();
          const colorRaw = item.color?.trim();
          if (pid && colorRaw) {
            const { data: samePartnerRows } = await supabaseAdmin
              .from('products')
              .select('id, color')
              .eq('partner_product_id', pid);
            const dup = (samePartnerRows || []).some(
              (row: { color?: string | null }) =>
                String(row.color || '').trim().toLowerCase() === colorRaw.toLowerCase(),
            );
            if (dup) {
              failed.push({
                title: item.title,
                reason: 'Already exists for this Printrove product ID and color.',
              });
              continue;
            }
          }

          const { data, error } = await supabaseAdmin
            .from('products')
            .insert([productData])
            .select('id, title, color, is_active')
            .single();

          if (error) throw error;
          created.push(data);
        } catch (itemErr: any) {
          failed.push({ title: item.title || '(unknown)', reason: itemErr.message || 'Insert failed' });
        }
      }

      // Invalidate products cache so admin-list reflects new drafts immediately
      await cache.del(cacheKeys.products);

      res.status(201).json({
        created,
        failed,
        summary: { total: items.length, created: created.length, failed: failed.length },
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// Get product by ID (public) - with caching
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const cacheKey = cacheKeys.product(id);
    
    // Try to get from cache first
    const cachedProduct = await cache.getJSON<any>(cacheKey);
    if (cachedProduct) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return res.json(cachedProduct);
    }
    
    console.log(`📦 Cache miss for ${cacheKey}, fetching from database`);
    
    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name,
          product_type
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Extract sizes from variants JSONB
    const variantData = extractVariantsFromDb(data.variants);
    data.variants = variantData;
    
    const category = data.categories;
    delete data.categories;
    const transformed = transformProduct(data, category);
    
    // Store in cache (6 hour TTL)
    await cache.setJSON(cacheKey, transformed, CACHE_TTL);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      category_id,
      collection_id,
      title,
      description,
      selling_price,
      discount_percentage,
      on_sale,
      sale_discount_percentage,
      usp_tag,
      main_image_url,
      main_image_file,
      mockup_images: mockupImagesInput,
      rating,
      review_count,
      sizes,
      size_prices,
      color,
      fulfillment_partner,
      partner_product_id,
      partner_variants,
      vendor_base_cost,
      vendor_shipping_cost,
      target_margin_percent,
      pricing_validation,
      size_chart_profile,
      design_family,
      is_featured,
    } = req.body;

    const sizesArray = normalizeSizeList(Array.isArray(sizes) ? sizes : (sizes ? [sizes] : []));
    const parsedSizePrices = parseSizePricesMap(size_prices, sizesArray);
    const variantsPayload = buildVariantsPayload(sizesArray, parsedSizePrices);

    console.log('📝 Creating product with data:', { title, sizes: sizesArray, color: color || null });
    
    const tempSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product';
    
    // Handle main image upload
    let finalMainImageUrl = main_image_url;
    if (main_image_file && !main_image_url) {
      try {
        if (typeof main_image_file === 'string' && main_image_file.startsWith('data:image')) {
          const base64Data = main_image_file.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          finalMainImageUrl = await uploadProductImage(buffer, tempSlug, 'main');
        } else {
          throw new Error('Invalid image file format. Use base64 image data.');
        }
      } catch (uploadError: any) {
        return res.status(400).json({ 
          error: `Failed to upload main image: ${uploadError.message}` 
        });
      }
    }
    
    // Prepare product data
    // Validate and parse selling_price
    const parsedSellingPrice = selling_price != null && selling_price !== '' 
      ? parseFloat(selling_price) 
      : 0;
    
    if (isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
      return res.status(400).json({ 
        error: 'Invalid selling_price. Must be a valid positive number.' 
      });
    }
    
    const parsedVendorBaseCost =
      vendor_base_cost !== undefined && vendor_base_cost !== null && vendor_base_cost !== ''
        ? parseFloat(vendor_base_cost)
        : 0;
    const parsedVendorShippingCost =
      vendor_shipping_cost !== undefined && vendor_shipping_cost !== null && vendor_shipping_cost !== ''
        ? parseFloat(vendor_shipping_cost)
        : 0;
    const parsedTargetMarginPercent =
      target_margin_percent !== undefined && target_margin_percent !== null && target_margin_percent !== ''
        ? parseFloat(target_margin_percent)
        : 100;
    const parsedDiscountPercentage =
      discount_percentage !== undefined && discount_percentage !== null && discount_percentage !== ''
        ? parseFloat(discount_percentage)
        : 0;
    const parsedOnSale = Boolean(on_sale);
    const parsedSaleDiscountPercentage =
      sale_discount_percentage !== undefined && sale_discount_percentage !== null && sale_discount_percentage !== ''
        ? parseFloat(sale_discount_percentage)
        : 0;

    if (
      !isValidPricingValidationPayload(pricing_validation) ||
      pricing_validation.suggested_price < 0 ||
      pricing_validation.discounted_price < 0 ||
      pricing_validation.final_price < 0
    ) {
      return res.status(400).json({
        error: 'Missing or invalid pricing_validation payload from frontend.',
      });
    }

    const listingSellingPrice = resolveListingSellingPrice(
      parsedSellingPrice,
      sizesArray,
      variantsPayload.size_prices,
    );

    const expectedPricingForValidation = createPricingValidationSnapshot({
      vendorBaseCost: parsedVendorBaseCost,
      vendorShippingCost: parsedVendorShippingCost,
      targetMarginPercent: parsedTargetMarginPercent,
      sellingPrice: listingSellingPrice,
      discountPercentage: parsedDiscountPercentage,
      onSale: parsedOnSale,
      saleDiscountPercentage: parsedSaleDiscountPercentage,
    });

    if (!pricingPayloadMatches(pricing_validation, expectedPricingForValidation)) {
      return res.status(409).json({
        error: 'Pricing mismatch between frontend and backend calculations. Please retry.',
        expected: expectedPricingForValidation,
      });
    }

    const productData: any = {
      category_id,
      collection_id: collection_id || null,
      title,
      description,
      selling_price: listingSellingPrice,
      main_image_url: finalMainImageUrl,
      variants: variantsPayload,
      color: color && String(color).trim() ? String(color).trim() : null,
      size_chart_profile: size_chart_profile || null,
      design_family: design_family && String(design_family).trim() ? String(design_family).trim() : null,
    };
    
    if (discount_percentage !== undefined && discount_percentage !== null) {
      productData.discount_percentage = parsedDiscountPercentage;
    }
    if (on_sale !== undefined) {
      productData.on_sale = parsedOnSale;
    }
    if (sale_discount_percentage !== undefined && sale_discount_percentage !== null) {
      productData.sale_discount_percentage = parsedSaleDiscountPercentage;
    }
    if (usp_tag) productData.usp_tag = usp_tag;
    if (is_featured !== undefined) productData.is_featured = Boolean(is_featured);
    if (rating !== undefined) productData.rating = parseFloat(rating);
    if (review_count !== undefined) productData.review_count = parseInt(review_count);
    if (fulfillment_partner) productData.fulfillment_partner = fulfillment_partner;
    if (partner_product_id) productData.partner_product_id = partner_product_id;
    productData.partner_variants = Array.isArray(partner_variants) ? partner_variants : [];
    if (vendor_base_cost !== undefined && vendor_base_cost !== null && vendor_base_cost !== '') {
      if (!isNaN(parsedVendorBaseCost) && parsedVendorBaseCost >= 0) {
        productData.vendor_base_cost = parsedVendorBaseCost;
      }
    }
    if (vendor_shipping_cost !== undefined && vendor_shipping_cost !== null && vendor_shipping_cost !== '') {
      if (!isNaN(parsedVendorShippingCost) && parsedVendorShippingCost >= 0) {
        productData.vendor_shipping_cost = parsedVendorShippingCost;
      }
    }
    if (target_margin_percent !== undefined && target_margin_percent !== null && target_margin_percent !== '') {
      if (!isNaN(parsedTargetMarginPercent) && parsedTargetMarginPercent >= 0) {
        productData.target_margin_percent = parsedTargetMarginPercent;
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name,
          product_type
        )
      `)
      .single();
    
    if (error) throw error;
    
    console.log('✅ Product created with variants:', { sizes: sizesArray });
    
    // Upload mockup images (single set per listing) and update product
    let uploadedMockupUrls: string[] = [];
    const mockupArray = Array.isArray(mockupImagesInput) ? mockupImagesInput : [];
    if (mockupArray.length > 0) {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < mockupArray.length; i++) {
        const imageData = mockupArray[i];
        if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
          try {
            const base64Data = imageData.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const url = await uploadProductImage(buffer, `${tempSlug}_mockup_${i}`, 'mockup');
            uploadedUrls.push(url);
          } catch (uploadError: any) {
            console.error('Failed to upload mockup image:', uploadError);
          }
        } else if (typeof imageData === 'string' && imageData.startsWith('http')) {
          uploadedUrls.push(imageData);
        }
      }
      if (uploadedUrls.length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from('products')
          .update({ mockup_images: uploadedUrls })
          .eq('id', data.id);
        if (updateErr) {
          console.error('Failed to save mockup_images to product:', updateErr);
          throw new Error(`Failed to save mockup images: ${updateErr.message}`);
        }
        uploadedMockupUrls = uploadedUrls;
      }
    }
    
    const category = data.categories;
    delete data.categories;
    const transformed = transformProduct(data, category);
    if (uploadedMockupUrls.length > 0) {
      transformed.mockup_images = uploadedMockupUrls;
    }
    
    // Cache the new product
    await cache.setJSON(cacheKeys.product(data.id), transformed, CACHE_TTL);
    
    // Upsert in cache arrays (products:all and category-specific cache)
    await upsertProductInCacheArrays(transformed);
    
    res.status(201).json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Get old product data to find old category slug for cache cleanup
    let oldCategorySlug: string | undefined;
    const { data: oldProduct } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories:category_id (
          slug
        )
      `)
      .eq('id', id)
      .single();
    
    if (oldProduct?.categories) {
      oldCategorySlug = oldProduct.categories.slug;
    }
    const {
      category_id,
      collection_id,
      title,
      description,
      selling_price,
      discount_percentage,
      on_sale,
      sale_discount_percentage,
      usp_tag,
      main_image_url,
      main_image_file,
      mockup_images: mockupImagesInput,
      rating,
      review_count,
      sizes,
      size_prices,
      color,
      fulfillment_partner,
      partner_product_id,
      partner_variants,
      vendor_base_cost,
      vendor_shipping_cost,
      target_margin_percent,
      pricing_validation,
      size_chart_profile,
      design_family,
      is_featured,
    } = req.body;

    const sizesArray = normalizeSizeList(Array.isArray(sizes) ? sizes : (sizes ? [sizes] : []));
    const parsedSizePrices = parseSizePricesMap(size_prices, sizesArray);
    const variantsPayload = buildVariantsPayload(sizesArray, parsedSizePrices);
    console.log('🔄 Updating product with data:', { id, sizes: sizesArray, color: color ?? null });
    
    const productSlug = title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || id.substring(0, 8);
    
    // Handle main image upload
    if (main_image_file && !main_image_url) {
      try {
        if (typeof main_image_file === 'string' && main_image_file.startsWith('data:image')) {
          const base64Data = main_image_file.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const uploadedUrl = await uploadProductImage(buffer, productSlug, 'main');
          req.body.main_image_url = uploadedUrl;
        } else {
          throw new Error('Invalid image file format. Use base64 image data.');
        }
      } catch (uploadError: any) {
        return res.status(400).json({ 
          error: `Failed to upload main image: ${uploadError.message}` 
        });
      }
    }
    
    // Prepare update data
    const productData: any = {};
    if (category_id) productData.category_id = category_id;
    if (collection_id !== undefined) {
      productData.collection_id = collection_id || null;
    }
    if (title) productData.title = title;
    if (description) productData.description = description;
    if (selling_price !== undefined && selling_price !== null && selling_price !== '') {
      const parsedPrice = parseFloat(selling_price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ 
          error: 'Invalid selling_price. Must be a valid positive number.' 
        });
      }
      productData.selling_price = parsedPrice;
    }
    if (discount_percentage !== undefined) {
      productData.discount_percentage = discount_percentage !== null ? parseFloat(discount_percentage) : null;
    }
    if (on_sale !== undefined) productData.on_sale = Boolean(on_sale);
    if (sale_discount_percentage !== undefined) {
      productData.sale_discount_percentage = sale_discount_percentage !== null ? parseFloat(sale_discount_percentage) : null;
    }
    if (usp_tag !== undefined) productData.usp_tag = usp_tag || null;
    if (is_featured !== undefined) productData.is_featured = Boolean(is_featured);
    if (main_image_url || req.body.main_image_url) productData.main_image_url = main_image_url || req.body.main_image_url;
    if (rating !== undefined) productData.rating = rating ? parseFloat(rating) : null;
    if (review_count !== undefined) productData.review_count = parseInt(review_count);
    if (sizesArray.length > 0) {
      productData.variants = variantsPayload;
      const baseForListing =
        selling_price !== undefined && selling_price !== null && selling_price !== ''
          ? parseFloat(selling_price)
          : undefined;
      if (!isNaN(baseForListing as number) && baseForListing !== undefined) {
        productData.selling_price = resolveListingSellingPrice(
          baseForListing,
          sizesArray,
          variantsPayload.size_prices,
        );
      } else if (variantsPayload.size_prices) {
        const minOnly = resolveListingSellingPrice(0, sizesArray, variantsPayload.size_prices);
        if (minOnly > 0) productData.selling_price = minOnly;
      }
    } else if (size_prices !== undefined) {
      productData.variants = variantsPayload;
    }
    if (color !== undefined) {
      productData.color = color && String(color).trim() ? String(color).trim() : null;
    }
    if (fulfillment_partner !== undefined) productData.fulfillment_partner = fulfillment_partner || null;
    if (partner_product_id !== undefined) productData.partner_product_id = partner_product_id || null;
    if (partner_variants !== undefined) {
      productData.partner_variants = Array.isArray(partner_variants) ? partner_variants : [];
    }
    // Allow publishing a draft: is_active can be set via update
    if (req.body.is_active !== undefined) {
      productData.is_active = Boolean(req.body.is_active);
    }
    if (size_chart_profile !== undefined) productData.size_chart_profile = size_chart_profile || null;
    if (design_family !== undefined) {
      productData.design_family = design_family && String(design_family).trim() ? String(design_family).trim() : null;
    }
    if (vendor_base_cost !== undefined) {
      if (vendor_base_cost === null || vendor_base_cost === '') {
        productData.vendor_base_cost = null;
      } else {
        const parsed = parseFloat(vendor_base_cost);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({
            error: 'Invalid vendor_base_cost. Must be a valid non-negative number.',
          });
        }
        productData.vendor_base_cost = parsed;
      }
    }
    if (vendor_shipping_cost !== undefined) {
      if (vendor_shipping_cost === null || vendor_shipping_cost === '') {
        productData.vendor_shipping_cost = null;
      } else {
        const parsed = parseFloat(vendor_shipping_cost);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({
            error: 'Invalid vendor_shipping_cost. Must be a valid non-negative number.',
          });
        }
        productData.vendor_shipping_cost = parsed;
      }
    }
    if (target_margin_percent !== undefined) {
      if (target_margin_percent === null || target_margin_percent === '') {
        productData.target_margin_percent = null;
      } else {
        const parsed = parseFloat(target_margin_percent);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({
            error: 'Invalid target_margin_percent. Must be a valid non-negative number.',
          });
        }
        productData.target_margin_percent = parsed;
      }
    }

    // Skip pricing validation for drafts (is_active = false means it's an unpublished draft)
    const remainsDraft = productData.is_active === false ||
      (productData.is_active === undefined && oldProduct?.is_active === false);

    if (!remainsDraft) {
      // Validate pricing computations from frontend against backend snapshot
      if (
        !isValidPricingValidationPayload(pricing_validation) ||
        pricing_validation.suggested_price < 0 ||
        pricing_validation.discounted_price < 0 ||
        pricing_validation.final_price < 0
      ) {
        return res.status(400).json({
          error: 'Missing or invalid pricing_validation payload from frontend.',
        });
      }
    }

    if (!remainsDraft) {
      const effectiveVendorBaseCost =
        productData.vendor_base_cost !== undefined
          ? (productData.vendor_base_cost ?? 0)
          : Number(oldProduct?.vendor_base_cost || 0);
      const effectiveVendorShippingCost =
        productData.vendor_shipping_cost !== undefined
          ? (productData.vendor_shipping_cost ?? 0)
          : Number(oldProduct?.vendor_shipping_cost || 0);
      const effectiveTargetMarginPercent =
        productData.target_margin_percent !== undefined
          ? (productData.target_margin_percent ?? 100)
          : Number(oldProduct?.target_margin_percent ?? 100);
      const effectiveSellingPrice =
        productData.selling_price !== undefined
          ? Number(productData.selling_price)
          : Number(oldProduct?.selling_price || 0);
      const effectiveDiscountPercentage =
        productData.discount_percentage !== undefined
          ? Number(productData.discount_percentage || 0)
          : Number(oldProduct?.discount_percentage || 0);
      const effectiveOnSale =
        productData.on_sale !== undefined ? Boolean(productData.on_sale) : Boolean(oldProduct?.on_sale);
      const effectiveSaleDiscountPercentage =
        productData.sale_discount_percentage !== undefined
          ? Number(productData.sale_discount_percentage || 0)
          : Number(oldProduct?.sale_discount_percentage || 0);

      const expectedPricing = createPricingValidationSnapshot({
        vendorBaseCost: effectiveVendorBaseCost,
        vendorShippingCost: effectiveVendorShippingCost,
        targetMarginPercent: effectiveTargetMarginPercent,
        sellingPrice: effectiveSellingPrice,
        discountPercentage: effectiveDiscountPercentage,
        onSale: effectiveOnSale,
        saleDiscountPercentage: effectiveSaleDiscountPercentage,
      });

      if (!pricingPayloadMatches(pricing_validation, expectedPricing)) {
        return res.status(409).json({
          error: 'Pricing mismatch between frontend and backend calculations. Please retry.',
          expected: expectedPricing,
        });
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', id)
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name,
          product_type
        )
      `)
      .single();
    
    if (error) throw error;
    
    console.log('✅ Product updated with variants:', { sizes: sizesArray });
    
    // Upload mockup images (single set per listing) and update product
    let uploadedMockupUrls: string[] = [];
    const mockupArray = Array.isArray(mockupImagesInput) ? mockupImagesInput : [];
    if (mockupArray.length > 0) {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < mockupArray.length; i++) {
        const imageData = mockupArray[i];
        if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
          try {
            const base64Data = imageData.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const url = await uploadProductImage(buffer, `${productSlug}_mockup_${i}`, 'mockup');
            uploadedUrls.push(url);
          } catch (uploadError: any) {
            console.error('Failed to upload mockup image:', uploadError);
          }
        } else if (typeof imageData === 'string' && imageData.startsWith('http')) {
          uploadedUrls.push(imageData);
        }
      }
      if (uploadedUrls.length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from('products')
          .update({ mockup_images: uploadedUrls })
          .eq('id', id);
        if (updateErr) {
          console.error('Failed to save mockup_images to product:', updateErr);
          throw new Error(`Failed to save mockup images: ${updateErr.message}`);
        }
        uploadedMockupUrls = uploadedUrls;
      }
    }
    
    const category = data.categories;
    delete data.categories;
    const transformed = transformProduct(data, category);
    if (uploadedMockupUrls.length > 0) {
      transformed.mockup_images = uploadedMockupUrls;
    }
    
    // Update product in cache
    await cache.setJSON(cacheKeys.product(id), transformed, CACHE_TTL);
    
    // Upsert in cache arrays (products:all and category-specific cache)
    await upsertProductInCacheArrays(transformed);
    
    // If category changed, remove from old category cache
    const newCategorySlug = category?.slug;
    if (oldCategorySlug && newCategorySlug && oldCategorySlug !== newCategorySlug) {
      await removeProductFromCacheArrays(id, oldCategorySlug);
    }
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Get product category slug before deletion for cache cleanup
    let categorySlug: string | undefined;
    const { data: productToDelete } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories:category_id (
          slug
        )
      `)
      .eq('id', id)
      .single();
    
    if (productToDelete?.categories) {
      categorySlug = productToDelete.categories.slug;
    }
    
    // Delete from database
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Remove from cache
    await cache.del(cacheKeys.product(id));
    
    // Remove from cache arrays (products:all and category-specific cache)
    await removeProductFromCacheArrays(id, categorySlug);
    
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;
