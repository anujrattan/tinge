/**
 * Product Routes
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { uploadProductImage, uploadProductVideo } from '../services/storage.js';
import gelatoService from '../services/gelato.js';
import { cache, cacheKeys } from '../services/redis.js';
import { extractSizesAndColors } from '../utils/variants.js';

/**
 * Store Gelato template variants in product_variants table
 * @param productId - Local product UUID
 * @param variants - Array of variants from Gelato template
 */
const storeGelatoVariants = async (productId: string, variants: any[]): Promise<void> => {
  if (!variants || variants.length === 0) {
    console.log('[Store Variants] No variants to store');
    return;
  }

  console.log(`[Store Variants] Storing ${variants.length} variants for product ${productId}`);

  for (const variant of variants) {
    const variantData = {
      title: variant.title,
      productUid: variant.productUid,
      variantOptions: variant.variantOptions || [],
      imagePlaceholders: variant.imagePlaceholders || [],
      textPlaceholders: variant.textPlaceholders || [],
    };

    // Extract size and color from variantOptions (primary source)
    let size: string | null = null;
    let color: string | null = null;
    let sizeFound = false;
    let colorFound = false;

    if (variant.variantOptions && Array.isArray(variant.variantOptions)) {
      variant.variantOptions.forEach((option: any) => {
        const optionName = (option.name || '').toLowerCase();
        const optionValue = (option.value || '').trim();

        if ((optionName === 'size') && optionValue) {
          size = optionValue;
          sizeFound = true;
        }
        if ((optionName === 'color' || optionName === 'colour') && optionValue) {
          color = optionValue;
          colorFound = true;
        }
      });
    }

    // Fallback: Extract from title if not found in variantOptions
    // Format: "White - L - DTG" or "Black - XL - Embroidery"
    if (variant.title) {
      const parts = variant.title.split(' - ').map((p: string) => p.trim());
      
      // Extract size from title if not found in variantOptions
      if (!sizeFound && parts.length >= 2) {
        const possibleSize = parts[1];
        // Validate it looks like a size
        if (/^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|\d+)$/i.test(possibleSize)) {
          size = possibleSize;
        }
      }

      // Extract color from title if not found in variantOptions
      if (!colorFound && parts.length >= 1) {
        const possibleColor = parts[0];
        // Only use if it doesn't look like a size
        if (!/^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|\d+)$/i.test(possibleColor)) {
          color = possibleColor;
        }
      }
    }

    // Add size and color to variant_data JSONB for backward compatibility
    variantData.size = size;
    variantData.color = color;

    try {
      const { error } = await supabase
        .from('product_variants')
        .upsert(
          {
            product_id: productId,
            gelato_variant_id: variant.id,
            gelato_product_id: variant.productUid,
            size: size, // Store in separate column for easy querying
            color: color, // Store in separate column for easy querying
            mockup_images: [], // Initialize empty array - admin can upload color-specific mockups later
            variant_data: variantData, // Keep full data in JSONB
          },
          {
            onConflict: 'product_id,gelato_variant_id',
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error(`[Store Variants] Error storing variant ${variant.id}:`, error);
      } else {
        console.log(`[Store Variants] ✅ Stored variant: ${variant.id} | Size: ${size || 'N/A'} | Color: ${color || 'N/A'}`);
      }
    } catch (err: any) {
      console.error(`[Store Variants] Exception storing variant ${variant.id}:`, err);
    }
  }

  console.log(`[Store Variants] ✅ Completed storing ${variants.length} variants`);
};

/**
 * Store mockup images by color in product_variants table
 * @param productId - Local product UUID
 * @param mockupImagesByColor - Object mapping color names to arrays of base64 image strings
 * @param tempSlug - Temporary slug for file naming
 */
const storeMockupImagesByColor = async (
  productId: string,
  mockupImagesByColor: Record<string, string[]>,
  tempSlug: string
): Promise<void> => {
  console.log(`[Store Mockup Images] Storing mockup images by color for product ${productId}`);
  
  for (const [color, imageDataArray] of Object.entries(mockupImagesByColor)) {
    if (!imageDataArray || imageDataArray.length === 0) continue;
    
    console.log(`[Store Mockup Images] Processing ${imageDataArray.length} images for color: ${color}`);
    
    const uploadedUrls: string[] = [];
    
    // Upload each image and get public URL
    for (let i = 0; i < imageDataArray.length; i++) {
      const imageData = imageDataArray[i];
      if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
        try {
          const base64Data = imageData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const uploadedUrl = await uploadProductImage(buffer, `${tempSlug}_${color}_${i}`, 'mockup');
          uploadedUrls.push(uploadedUrl);
          console.log(`[Store Mockup Images] ✅ Uploaded image ${i + 1} for ${color}: ${uploadedUrl}`);
        } catch (uploadError: any) {
          console.error(`[Store Mockup Images] ❌ Failed to upload image ${i + 1} for ${color}:`, uploadError);
          // Continue with other images
        }
      } else if (typeof imageData === 'string' && imageData.startsWith('http')) {
        // Already a URL, use as is
        uploadedUrls.push(imageData);
      }
    }
    
    if (uploadedUrls.length === 0) {
      console.log(`[Store Mockup Images] No valid images for color ${color}, skipping`);
      continue;
    }
    
    // Update product_variants table with mockup images for this color
    // Find all variants with this color and update their mockup_images
    const { error: updateError } = await supabase
      .from('product_variants')
      .update({
        mockup_images: uploadedUrls,
      })
      .eq('product_id', productId)
      .eq('color', color);
    
    if (updateError) {
      console.error(`[Store Mockup Images] ❌ Failed to update variants for color ${color}:`, updateError);
    } else {
      console.log(`[Store Mockup Images] ✅ Updated ${color} variants with ${uploadedUrls.length} mockup images`);
    }
  }
  
  console.log(`[Store Mockup Images] ✅ Completed storing mockup images by color`);
};

const router = Router();

// Helper function to transform database product to API format
const transformProduct = (dbProduct: any, category?: any) => {
  const sellingPrice = parseFloat(dbProduct.selling_price || dbProduct.price || 0);
  // Only treat as discount if discount_percentage exists and > 0
  const discountPercentage = dbProduct.discount_percentage != null && dbProduct.discount_percentage > 0
    ? parseFloat(dbProduct.discount_percentage)
    : null;
  
  // Sale discount (multiplicative stacking)
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
  
  // Get category slug from joined category or from dbProduct
  const categorySlug = category?.slug || dbProduct.category || '';
  
  return {
    // New schema fields
    id: dbProduct.id,
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
    review_count: dbProduct.review_count || dbProduct.reviewCount || 0,
    variants: dbProduct.variants || { sizes: [], colors: [] },
    variants_with_mockups: dbProduct.variants_with_mockups || undefined, // Mockup images organized by color
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at,
    // Gelato fields
    gelato_template_id: dbProduct.gelato_template_id || undefined,
    gelato_product_id: dbProduct.gelato_product_id || undefined,
    gelato_preview_url: dbProduct.gelato_preview_url || undefined,
    gelato_template_data: dbProduct.gelato_template_data || undefined,
    gelato_status: dbProduct.gelato_status || undefined,
    // Legacy fields for backward compatibility
    name: dbProduct.title || dbProduct.name,
    price: finalPrice, // Final price after all discounts (multiplicative stacking)
    originalPrice: hasAnyDiscount ? sellingPrice : undefined, // Only show originalPrice if there's any discount
    imageUrl: dbProduct.main_image_url || dbProduct.imageUrl || dbProduct.image_url,
    category: categorySlug,
    tags: dbProduct.usp_tag ? [dbProduct.usp_tag] : [],
    reviewCount: dbProduct.review_count || dbProduct.reviewCount || 0,
    discount: hasAnyDiscount ? `Save $${totalSavings.toFixed(0)}` : undefined, // Cumulative savings from all discounts
  };
};

// Get all products (public) - with category join and Redis caching
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query; // category can be category_id UUID or category slug
    
    // Determine cache key and check cache FIRST (cache-first approach)
    let cacheKey: string;
    let categorySlug: string | undefined = undefined;
    let categoryId: string | undefined = undefined;
    
    if (category) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category as string);
      if (isUUID) {
        // If UUID, we need to get slug for cache key - but only do DB lookup if cache miss
        // First try to get from cache using UUID-based key (fallback)
        categoryId = category as string;
        // Try UUID-based cache key first
        const uuidCacheKey = `products:category:uuid:${categoryId}`;
        const uuidCachedData = await cache.get<any[]>(uuidCacheKey);
        if (uuidCachedData) {
          return res.json(uuidCachedData);
        }
        
        // Cache miss - now do DB lookup to get slug for proper cache key
        const { data: categoryData } = await supabase
          .from('categories')
          .select('slug')
          .eq('id', category)
          .single();
        if (categoryData) {
          categorySlug = categoryData.slug;
          cacheKey = cacheKeys.productsByCategory(categoryData.slug);
        } else {
          cacheKey = cacheKeys.products; // Fallback to all products
        }
      } else {
        // Category is a slug - use it directly for cache key
        categorySlug = category as string;
        cacheKey = cacheKeys.productsByCategory(categorySlug);
      }
    } else {
      cacheKey = cacheKeys.products;
    }
    
    // Try to get from cache first (cache-first approach)
    const cachedData = await cache.get<any[]>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Cache miss - fetch from database
    // If filtering by slug, first get the category_id (if not already set)
    if (category && !categoryId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category as string);
      if (!isUUID) {
        // Look up category by slug to get its ID
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .single();
        if (categoryData) {
          categoryId = categoryData.id;
        }
      }
    }
    
    // Join with categories to get category slug
    let query = supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name
        )
      `);
    
    // Filter by category_id if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform products with category data
    const transformed = (data || []).map((product: any) => {
      const category = product.categories;
      delete product.categories; // Remove nested category object
      return transformProduct(product, category);
    });
    
    // Store in cache (1 hour TTL)
    await cache.set(cacheKey, transformed, 3600);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Get product by ID (public) - with category join, variants, and Redis caching
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = cacheKeys.product(id);
    
    // Try to get from cache first
    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Fetch product variants with mockup images
    const { data: variants } = await supabase
      .from('product_variants')
      .select('color, size, mockup_images')
      .eq('product_id', id);
    
    // Group mockup images by color
    const mockupImagesByColor: Record<string, string[]> = {};
    if (variants) {
      variants.forEach((variant: any) => {
        if (variant.color && variant.mockup_images && Array.isArray(variant.mockup_images) && variant.mockup_images.length > 0) {
          // Use first variant's mockup_images for each color (all variants of same color should have same mockups)
          if (!mockupImagesByColor[variant.color]) {
            mockupImagesByColor[variant.color] = variant.mockup_images;
          }
        }
      });
    }
    
    // Add variants with mockup images to product data
    if (Object.keys(mockupImagesByColor).length > 0) {
      data.variants_with_mockups = mockupImagesByColor;
    }
    
    const category = data.categories;
    delete data.categories;
    const transformed = transformProduct(data, category);
    
    // Store in cache (1 hour TTL)
    await cache.set(cacheKey, transformed, 3600);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const {
      category_id,
      title,
      description,
      selling_price,
      discount_percentage,
      on_sale,
      sale_discount_percentage,
      usp_tag,
      gelato_template_id,
      main_image_url,
      main_image_file,
      mockup_images,
      mockup_images_by_color,
      mockup_video_url,
      mockup_video_file,
      rating,
      review_count,
      variants,
    } = req.body;
    
    // Generate a temporary slug for file naming (before product is created)
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
    
    // Handle mockup images upload
    let finalMockupImages: string[] = [];
    if (mockup_images && Array.isArray(mockup_images)) {
      for (let i = 0; i < mockup_images.length; i++) {
        const item = mockup_images[i];
        if (typeof item === 'string') {
          if (item.startsWith('data:image')) {
            // Base64 image - upload it
            try {
              const base64Data = item.split(',')[1];
              const buffer = Buffer.from(base64Data, 'base64');
              const uploadedUrl = await uploadProductImage(buffer, `${tempSlug}_${i}`, 'mockup');
              finalMockupImages.push(uploadedUrl);
            } catch (uploadError: any) {
              console.error(`Failed to upload mockup image ${i}:`, uploadError);
              // Skip this image but continue with others
            }
          } else {
            // Regular URL - use as is
            finalMockupImages.push(item);
          }
        }
      }
    }
    
    // Handle video upload
    let finalVideoUrl = mockup_video_url;
    if (mockup_video_file && !mockup_video_url) {
      try {
        if (typeof mockup_video_file === 'string' && mockup_video_file.startsWith('data:video')) {
          const base64Data = mockup_video_file.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          finalVideoUrl = await uploadProductVideo(buffer, tempSlug);
        } else {
          throw new Error('Invalid video file format. Use base64 video data.');
        }
      } catch (uploadError: any) {
        return res.status(400).json({ 
          error: `Failed to upload video: ${uploadError.message}` 
        });
      }
    }
    
    // Prepare product data for database (snake_case)
    const productData: any = {
      category_id,
      title,
      description,
      selling_price: parseFloat(selling_price),
      main_image_url: finalMainImageUrl,
      variants: variants || { sizes: [], colors: [] },
    };
    
    if (discount_percentage !== undefined && discount_percentage !== null) {
      productData.discount_percentage = parseFloat(discount_percentage);
    }
    if (on_sale !== undefined) {
      productData.on_sale = Boolean(on_sale);
    }
    if (sale_discount_percentage !== undefined && sale_discount_percentage !== null) {
      productData.sale_discount_percentage = parseFloat(sale_discount_percentage);
    }
    if (usp_tag) productData.usp_tag = usp_tag;
    if (gelato_template_id) productData.gelato_template_id = gelato_template_id;
    if (finalMockupImages.length > 0) {
      productData.mockup_images = finalMockupImages;
    }
    if (finalVideoUrl) productData.mockup_video_url = finalVideoUrl;
    if (rating !== undefined) productData.rating = parseFloat(rating);
    if (review_count !== undefined) productData.review_count = parseInt(review_count);
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name
        )
      `)
      .single();
    
    if (error) throw error;
    
    // If gelato_template_id is provided, fetch template details from Gelato and store
    if (gelato_template_id && data.id) {
      try {
        console.log('[Product Create] ========================================');
        console.log('[Product Create] Gelato template ID provided, fetching template details...');
        console.log('[Product Create] Product ID:', data.id);
        console.log('[Product Create] Template ID:', gelato_template_id);
        
        const templateData = await gelatoService.getTemplate(gelato_template_id);
        
        console.log('[Product Create] ✅ Template fetched successfully');
        
        // Extract sizes and colors from variants
        const variants = templateData.variants || [];
        const { sizes, colors } = extractSizesAndColors(variants);
        
        console.log('[Product Create] Extracted sizes:', sizes);
        console.log('[Product Create] Extracted colors:', colors);
        
        // Prepare template metadata to store (excluding variants, we'll store those separately)
        const templateMetadata = {
          templateName: templateData.templateName || templateData.title,
          title: templateData.title,
          description: templateData.description,
          productType: templateData.productType,
          vendor: templateData.vendor,
          imagePlaceholders: templateData.variants?.[0]?.imagePlaceholders || [],
          textPlaceholders: templateData.variants?.[0]?.textPlaceholders || [],
          createdAt: templateData.createdAt,
          updatedAt: templateData.updatedAt,
        };
        
        // Update product with template data and preview URL
        const { error: updateError } = await supabase
          .from('products')
          .update({
            gelato_template_data: templateMetadata,
            gelato_preview_url: templateData.previewUrl,
            // Update variants field with extracted sizes and colors
            variants: {
              sizes: sizes.length > 0 ? sizes : (productData.variants?.sizes || []),
              colors: colors.length > 0 ? colors : (productData.variants?.colors || []),
            },
          })
          .eq('id', data.id);
        
        if (updateError) {
          console.error('[Product Create] ❌ Failed to update product with template data:', updateError);
        } else {
          console.log('[Product Create] ✅ Updated product with template metadata');
        }
        
        // Store variants in product_variants table
        await storeGelatoVariants(data.id, variants);
        
        // Handle mockup images by color - store them in product_variants
        if (mockup_images_by_color && typeof mockup_images_by_color === 'object') {
          await storeMockupImagesByColor(data.id, mockup_images_by_color, tempSlug);
        }
        
        console.log('[Product Create] ========================================');
      } catch (gelatoError: any) {
        console.error('[Product Create] ========================================');
        console.error('[Product Create] ❌ Failed to fetch/store Gelato template');
        console.error('[Product Create] Error:', gelatoError.message);
        console.error('[Product Create] Stack:', gelatoError.stack);
        console.error('[Product Create] ========================================');
        // Don't fail the product creation, just log the error
        // Product is already saved in DB
      }
    }
    
    // Refetch product with all updates (including Gelato template data if applicable)
    // and fetch variants with mockup images
    const { data: finalProductData, error: refetchError } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name
        )
      `)
      .eq('id', data.id)
      .single();
    
    if (refetchError) {
      console.error('[Product Create] Failed to refetch product:', refetchError);
      // Continue with original data if refetch fails
    } else {
      data = finalProductData;
    }
    
    // Fetch product variants with mockup images for cache
    const { data: productVariants } = await supabase
      .from('product_variants')
      .select('color, size, mockup_images')
      .eq('product_id', data.id);
    
    // Group mockup images by color
    const mockupImagesByColor: Record<string, string[]> = {};
    if (productVariants) {
      productVariants.forEach((variant: any) => {
        if (variant.color && variant.mockup_images && Array.isArray(variant.mockup_images) && variant.mockup_images.length > 0) {
          if (!mockupImagesByColor[variant.color]) {
            mockupImagesByColor[variant.color] = variant.mockup_images;
          }
        }
      });
    }
    
    // Add variants with mockup images to product data
    if (Object.keys(mockupImagesByColor).length > 0) {
      data.variants_with_mockups = mockupImagesByColor;
    }
    
    const category = data.categories;
    delete data.categories;
    const transformed = transformProduct(data, category);
    
    // Redis cache invalidation and upsert
    // Invalidate all products list cache
    await cache.del(cacheKeys.products);
    
    // Invalidate category-specific cache
    const categorySlug = category?.slug;
    if (categorySlug) {
      await cache.del(cacheKeys.productsByCategory(categorySlug));
    }
    
    // Upsert the new product into cache
    await cache.set(cacheKeys.product(data.id), transformed, 3600);
    
    res.status(201).json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      title,
      description,
      selling_price,
      discount_percentage,
      on_sale,
      sale_discount_percentage,
      usp_tag,
      gelato_template_id,
      main_image_url,
      main_image_file,
      mockup_images,
      mockup_images_by_color,
      mockup_video_url,
      mockup_video_file,
      rating,
      review_count,
      variants,
    } = req.body;
    
    // Get existing product to identify cache keys to invalidate
    const { data: existingProduct } = await supabase
      .from('products')
      .select('title, category_id, categories:category_id(slug)')
      .eq('id', id)
      .single();
    
    const oldCategorySlug = existingProduct?.categories?.slug;
    
    const productSlug = existingProduct?.title 
      ? existingProduct.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : id.substring(0, 8);
    
    // Handle main image upload
    if (main_image_file && !main_image_url) {
      try {
        if (typeof main_image_file === 'string' && main_image_file.startsWith('data:image')) {
          const base64Data = main_image_file.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const uploadedUrl = await uploadProductImage(buffer, productSlug, 'main');
          // Set main_image_url to the uploaded URL
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
    
    // Handle mockup images upload
    let finalMockupImages: string[] | undefined = undefined;
    if (mockup_images !== undefined && Array.isArray(mockup_images)) {
      finalMockupImages = [];
      for (let i = 0; i < mockup_images.length; i++) {
        const item = mockup_images[i];
        if (typeof item === 'string') {
          if (item.startsWith('data:image')) {
            // Base64 image - upload it
            try {
              const base64Data = item.split(',')[1];
              const buffer = Buffer.from(base64Data, 'base64');
              const uploadedUrl = await uploadProductImage(buffer, `${productSlug}_${i}`, 'mockup');
              finalMockupImages.push(uploadedUrl);
            } catch (uploadError: any) {
              console.error(`Failed to upload mockup image ${i}:`, uploadError);
              // Skip this image but continue with others
            }
          } else {
            // Regular URL - use as is
            finalMockupImages.push(item);
          }
        }
      }
    }
    
    // Handle video upload
    if (mockup_video_file && !mockup_video_url) {
      try {
        if (typeof mockup_video_file === 'string' && mockup_video_file.startsWith('data:video')) {
          const base64Data = mockup_video_file.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const uploadedUrl = await uploadProductVideo(buffer, productSlug);
          // Set mockup_video_url to the uploaded URL
          req.body.mockup_video_url = uploadedUrl;
        } else {
          throw new Error('Invalid video file format. Use base64 video data.');
        }
      } catch (uploadError: any) {
        return res.status(400).json({ 
          error: `Failed to upload video: ${uploadError.message}` 
        });
      }
    }
    
    // Prepare update data for database (snake_case)
    const productData: any = {};
    if (category_id) productData.category_id = category_id;
    if (title) productData.title = title;
    if (description) productData.description = description;
    if (selling_price !== undefined) productData.selling_price = parseFloat(selling_price);
    if (discount_percentage !== undefined && discount_percentage !== null) {
      productData.discount_percentage = parseFloat(discount_percentage);
    } else if (discount_percentage === null) {
      productData.discount_percentage = null;
    }
    if (on_sale !== undefined) {
      productData.on_sale = Boolean(on_sale);
    }
    if (sale_discount_percentage !== undefined && sale_discount_percentage !== null) {
      productData.sale_discount_percentage = parseFloat(sale_discount_percentage);
    } else if (sale_discount_percentage === null) {
      productData.sale_discount_percentage = null;
    }
    if (usp_tag !== undefined) productData.usp_tag = usp_tag || null;
    if (gelato_template_id !== undefined) productData.gelato_template_id = gelato_template_id || null;
    if (main_image_url || req.body.main_image_url) productData.main_image_url = main_image_url || req.body.main_image_url;
    if (finalMockupImages !== undefined) productData.mockup_images = finalMockupImages;
    if (mockup_video_url !== undefined || req.body.mockup_video_url !== undefined) {
      productData.mockup_video_url = mockup_video_url || req.body.mockup_video_url || null;
    }
    if (rating !== undefined) productData.rating = rating ? parseFloat(rating) : null;
    if (review_count !== undefined) productData.review_count = parseInt(review_count);
    if (variants) productData.variants = variants;
    
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select(`
        *,
        categories:category_id (
          id,
          slug,
          name
        )
      `)
      .single();
    
    if (error) throw error;
    
    // If gelato_template_id is provided, fetch template details from Gelato and store
    if (gelato_template_id && data.id) {
      try {
        console.log('[Product Update] ========================================');
        console.log('[Product Update] Gelato template ID provided, fetching template details...');
        console.log('[Product Update] Product ID:', data.id);
        console.log('[Product Update] Template ID:', gelato_template_id);
        
        const templateData = await gelatoService.getTemplate(gelato_template_id);
        
        console.log('[Product Update] ✅ Template fetched successfully');
        
        // Extract sizes and colors from variants
        const variants = templateData.variants || [];
        const { sizes, colors } = extractSizesAndColors(variants);
        
        console.log('[Product Update] Extracted sizes:', sizes);
        console.log('[Product Update] Extracted colors:', colors);
        
        // Prepare template metadata to store (excluding variants, we'll store those separately)
        const templateMetadata = {
          templateName: templateData.templateName || templateData.title,
          title: templateData.title,
          description: templateData.description,
          productType: templateData.productType,
          vendor: templateData.vendor,
          imagePlaceholders: templateData.variants?.[0]?.imagePlaceholders || [],
          textPlaceholders: templateData.variants?.[0]?.textPlaceholders || [],
          createdAt: templateData.createdAt,
          updatedAt: templateData.updatedAt,
        };
        
        // Get current variants to preserve if new ones are empty
        const currentVariants = data.variants || { sizes: [], colors: [] };
        
        // Update product with template data and preview URL
        const updateData: any = {
          gelato_template_data: templateMetadata,
          gelato_preview_url: templateData.previewUrl,
        };
        
        // Update variants field only if we extracted sizes/colors, otherwise keep existing
        if (sizes.length > 0 || colors.length > 0) {
          updateData.variants = {
            sizes: sizes.length > 0 ? sizes : currentVariants.sizes,
            colors: colors.length > 0 ? colors : currentVariants.colors,
          };
        }
        
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', data.id);
        
        if (updateError) {
          console.error('[Product Update] ❌ Failed to update product with template data:', updateError);
        } else {
          console.log('[Product Update] ✅ Updated product with template metadata');
        }
        
        // Store variants in product_variants table
        await storeGelatoVariants(data.id, variants);
        
        // Handle mockup images by color - store them in product_variants
        if (mockup_images_by_color && typeof mockup_images_by_color === 'object') {
          const tempSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product';
          await storeMockupImagesByColor(data.id, mockup_images_by_color, tempSlug);
        }
        
        console.log('[Product Update] ========================================');
      } catch (gelatoError: any) {
        console.error('[Product Update] ========================================');
        console.error('[Product Update] ❌ Failed to fetch/store Gelato template');
        console.error('[Product Update] Error:', gelatoError.message);
        console.error('[Product Update] Stack:', gelatoError.stack);
        console.error('[Product Update] ========================================');
        // Don't fail the product update, just log the error
      }
    } else {
      // Handle mockup images by color even if no gelato_template_id
      if (mockup_images_by_color && typeof mockup_images_by_color === 'object') {
        const tempSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product';
        await storeMockupImagesByColor(data.id, mockup_images_by_color, tempSlug);
      }
    }
    
    const category = data.categories;
    delete data.categories;
    const transformed = transformProduct(data, category);
    
    // Cache invalidation and upsert
    await cache.del(cacheKeys.products); // Invalidate all products list
    await cache.del(cacheKeys.product(id)); // Invalidate old product cache
    
    // Invalidate category-specific caches (old and new if category changed)
    if (oldCategorySlug) {
      await cache.del(cacheKeys.productsByCategory(oldCategorySlug));
    }
    if (transformed.category && transformed.category !== oldCategorySlug) {
      await cache.del(cacheKeys.productsByCategory(transformed.category));
    }
    
    // Cache the updated product
    await cache.set(cacheKeys.product(id), transformed, 3600);
    
    res.json(transformed);
  } catch (error: any) {
    next(error);
  }
});

// Delete product (admin only) - with Redis cache invalidation
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    
    // Get product data before deletion to identify cache keys to invalidate
    const { data: productToDelete } = await supabase
      .from('products')
      .select('category_id, categories:category_id(slug)')
      .eq('id', id)
      .single();
    
    const categorySlug = productToDelete?.categories?.slug;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Cache invalidation
    await cache.del(cacheKeys.products); // Invalidate all products list
    await cache.del(cacheKeys.product(id)); // Invalidate product cache
    if (categorySlug) {
      await cache.del(cacheKeys.productsByCategory(categorySlug)); // Invalidate category-specific list
    }
    
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

