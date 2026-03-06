import { Router, Request, Response, NextFunction } from "express";
import { authenticateOrGuest, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabase.js";
import { WISHLIST_CONFIG } from "../config/constants.js";
import * as wishlistCache from "../services/wishlistCache.js";

const router = Router();

/**
 * Helper: Get wishlist key for Redis based on user type
 */
function getWishlistKey(req: AuthRequest): string {
  if (req.isGuest && req.guestSessionId) {
    return wishlistCache.getGuestWishlistKey(req.guestSessionId);
  } else if (req.userId) {
    return wishlistCache.getUserWishlistKey(req.userId);
  }
  throw new Error("Invalid request: No user ID or guest session ID");
}

/**
 * GET /api/wishlists
 * Get all wishlist items (supports both authenticated and guest users)
 */
router.get("/", authenticateOrGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const wishlistKey = getWishlistKey(authReq);
    
    // For guest users: Only return from Redis
    if (authReq.isGuest) {
      const productIds = await wishlistCache.getWishlistFromCache(wishlistKey) || [];
      
      // Fetch product details for each ID
      const products = await Promise.all(
        productIds.map(async (productId) => {
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("*")
            .eq("id", productId)
            .eq("is_active", true)
            .single();
          return product;
        })
      );
      
      const validProducts = products.filter(p => p !== null);
      
      return res.json({
        success: true,
        items: validProducts.map(product => ({
          id: product.id,
          product_id: product.id,
          product: {
            id: product.id,
            title: product.title,
            description: product.description,
            price: parseFloat(product.price) || 0,
            compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
            category: product.category,
            images: product.images || [],
            sizes: product.sizes || [],
            colors: product.colors || [],
            isActive: product.is_active,
            createdAt: product.created_at,
          },
        })),
        count: validProducts.length,
        maxItems: WISHLIST_CONFIG.MAX_ITEMS,
      });
    }
    
    // For authenticated users: Try Redis first, then DB
    let productIds = await wishlistCache.getWishlistFromCache(wishlistKey);
    
    if (!productIds) {
      // Cache miss - load from DB
      const userId = authReq.userId!;
      
      // Get user record
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_user_id", userId)
        .single();

      // If there is no user profile yet, treat it as "no wishlist items"
      // instead of an error so first-time logged-in users don't see failures.
      if (userError || !user) {
        console.warn(
          "[WISHLIST] No user record found for auth_user_id, returning empty wishlist"
        );
        return res.json({
          success: true,
          items: [],
          count: 0,
          maxItems: WISHLIST_CONFIG.MAX_ITEMS,
        });
      }

      // Get wishlist from DB
      const { data: wishlistItems, error: wishlistError } = await supabaseAdmin
        .from("wishlists")
        .select(`
          id,
          product_id,
          created_at,
          products (
            id,
            title,
            description,
            price,
            compare_at_price,
            category,
            images,
            sizes,
            colors,
            is_active,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (wishlistError) {
        throw wishlistError;
      }

      // Extract product IDs and cache them
      productIds = wishlistItems.map((item: any) => item.product_id);
      await wishlistCache.setWishlistInCache(wishlistKey, productIds);

      // Transform the data
      const transformedItems = wishlistItems.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        created_at: item.created_at,
        product: item.products ? {
          id: item.products.id,
          title: item.products.title,
          description: item.products.description,
          price: parseFloat(item.products.price) || 0,
          compareAtPrice: item.products.compare_at_price ? parseFloat(item.products.compare_at_price) : undefined,
          category: item.products.category,
          images: item.products.images || [],
          sizes: item.products.sizes || [],
          colors: item.products.colors || [],
          isActive: item.products.is_active,
          createdAt: item.products.created_at,
        } : null,
      }));

      return res.json({
        success: true,
        items: transformedItems,
        count: transformedItems.length,
        maxItems: WISHLIST_CONFIG.MAX_ITEMS,
      });
    }
    
    // Redis hit - fetch product details
    const products = await Promise.all(
      productIds.map(async (productId) => {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("is_active", true)
          .single();
        return product;
      })
    );
    
    const validProducts = products.filter(p => p !== null);
    
    res.json({
      success: true,
      items: validProducts.map(product => ({
        id: product.id,
        product_id: product.id,
        product: {
          id: product.id,
          title: product.title,
          description: product.description,
          price: parseFloat(product.price) || 0,
          compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
          category: product.category,
          images: product.images || [],
          sizes: product.sizes || [],
          colors: product.colors || [],
          isActive: product.is_active,
          createdAt: product.created_at,
        },
      })),
      count: validProducts.length,
      maxItems: WISHLIST_CONFIG.MAX_ITEMS,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/wishlists
 * Add a product to wishlist (supports both authenticated and guest users)
 */
router.post("/", authenticateOrGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    const wishlistKey = getWishlistKey(authReq);
    
    // Check if product exists and is active
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, is_active")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cannot add inactive product to wishlist",
      });
    }

    // Get current wishlist from Redis
    const currentWishlist = await wishlistCache.getWishlistFromCache(wishlistKey) || [];
    
    // Check if already in wishlist
    if (currentWishlist.includes(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Product is already in your wishlist",
      });
    }

    // Check limit
    if (currentWishlist.length >= WISHLIST_CONFIG.MAX_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Wishlist is full. Maximum ${WISHLIST_CONFIG.MAX_ITEMS} items allowed.`,
        maxItems: WISHLIST_CONFIG.MAX_ITEMS,
      });
    }

    // Add to Redis
    await wishlistCache.addToWishlistCache(wishlistKey, product_id);

    // For authenticated users: Also save to DB
    if (!authReq.isGuest && authReq.userId) {
      // Get user record
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_user_id", authReq.userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Add to DB
      const { error: insertError } = await supabaseAdmin
        .from("wishlists")
        .insert({
          user_id: user.id,
          product_id: product_id,
        });

      if (insertError && insertError.code !== "23505") {
        // Ignore duplicate constraint violations
        throw insertError;
      }
    }

    res.status(201).json({
      success: true,
      message: "Product added to wishlist",
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * DELETE /api/wishlists/:productId
 * Remove a product from wishlist
 */
router.delete("/:productId", authenticateOrGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { productId } = req.params;

    const wishlistKey = getWishlistKey(authReq);

    // Remove from Redis
    await wishlistCache.removeFromWishlistCache(wishlistKey, productId);

    // For authenticated users: Also remove from DB
    if (!authReq.isGuest && authReq.userId) {
      // Get user record
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_user_id", authReq.userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete from DB
      await supabaseAdmin
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
    }

    res.json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
