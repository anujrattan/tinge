/**
 * Users Routes
 * 
 * Handles user profile and order-related endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

const router = Router();

/**
 * Middleware to authenticate and extract user ID from JWT token
 */
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
        role: string;
      };

      (req as any).userId = decoded.userId;
      (req as any).userRole = decoded.role;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /api/users/profile
 * Get user profile with addresses
 */
router.get("/profile", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    // Get user profile from user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, name, role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // Get user record from users table (for basic info)
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("auth_user_id", userId)
      .single();

    // Get all addresses from user_addresses
    const { data: addresses, error: addressesError } = await supabaseAdmin
      .from("user_addresses")
      .select("*")
      .eq("user_id", user?.id || "")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    // If no addresses exist but user record exists, create a primary address from user record
    let userAddresses = addresses || [];
    if (user && (!addresses || addresses.length === 0) && user.address1) {
      // Create primary address from user record
      const { data: newAddress } = await supabaseAdmin
        .from("user_addresses")
        .insert({
          user_id: user.id,
          label: "Default",
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          address1: user.address1,
          address2: user.address2,
          city: user.city,
          province: user.province,
          zip: user.zip,
          country_code: user.country_code,
          type: user.type || "shipping",
          is_primary: true,
        })
        .select()
        .single();

      if (newAddress) {
        userAddresses = [newAddress];
      }
    }

    res.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        phone: user?.phone || null,
      },
      addresses: userAddresses || [],
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/users/orders
 * Get all orders for authenticated user
 */
router.get("/orders", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    // Get user record from users table
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    // If there is no corresponding row in users yet, treat this as "no orders"
    // instead of a hard 404 so that newly created auth users don't see errors.
    if (userError || !user) {
      console.warn(
        "[USERS] /users/orders: No user row found for auth_user_id, returning empty orders array"
      );
      return res.json({
        success: true,
        orders: [],
        total: 0,
      });
    }

    // Get all orders for this user
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order: any) => {
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        return {
          ...order,
          items: orderItems || [],
        };
      })
    );

    res.json({
      success: true,
      orders: ordersWithItems,
      total: ordersWithItems.length,
    });
  } catch (error: any) {
    next(error);
  }
});


/**
 * POST /api/users/addresses
 * Create a new address for the authenticated user
 */
router.post("/addresses", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    // Get user record from users table
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      label,
      first_name,
      last_name,
      phone,
      address1,
      address2,
      city,
      province,
      zip,
      country_code = "IN",
      type = "shipping",
      is_primary = false,
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !address1 || !city || !zip) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: first_name, last_name, address1, city, zip",
      });
    }

    // If setting as primary, unset other primary addresses
    if (is_primary) {
      await supabaseAdmin
        .from("user_addresses")
        .update({ is_primary: false })
        .eq("user_id", user.id);
    }

    // Create address
    const { data: address, error: addressError } = await supabaseAdmin
      .from("user_addresses")
      .insert({
        user_id: user.id,
        label: label || null,
        first_name,
        last_name,
        phone: phone || null,
        address1,
        address2: address2 || null,
        city,
        province: province || null,
        zip,
        country_code,
        type,
        is_primary,
      })
      .select()
      .single();

    if (addressError) {
      return res.status(400).json({
        success: false,
        message: addressError.message || "Failed to create address",
      });
    }

    res.status(201).json({
      success: true,
      address,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PUT /api/users/addresses/:addressId
 * Update an existing address
 */
router.put("/addresses/:addressId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { addressId } = req.params;

    // Get user record
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to user
    const { data: existingAddress, error: checkError } = await supabaseAdmin
      .from("user_addresses")
      .select("id, user_id")
      .eq("id", addressId)
      .single();

    if (checkError || !existingAddress || existingAddress.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      label,
      first_name,
      last_name,
      phone,
      address1,
      address2,
      city,
      province,
      zip,
      country_code,
      type,
      is_primary,
    } = req.body;

    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address1 !== undefined) updateData.address1 = address1;
    if (address2 !== undefined) updateData.address2 = address2;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (zip !== undefined) updateData.zip = zip;
    if (country_code !== undefined) updateData.country_code = country_code;
    if (type !== undefined) updateData.type = type;
    if (is_primary !== undefined) updateData.is_primary = is_primary;

    // If setting as primary, unset other primary addresses
    if (is_primary === true) {
      await supabaseAdmin
        .from("user_addresses")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .neq("id", addressId);
    }

    const { data: address, error: updateError } = await supabaseAdmin
      .from("user_addresses")
      .update(updateData)
      .eq("id", addressId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message || "Failed to update address",
      });
    }

    res.json({
      success: true,
      address,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * DELETE /api/users/addresses/:addressId
 * Delete an address
 */
router.delete("/addresses/:addressId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { addressId } = req.params;

    // Get user record
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to user
    const { data: existingAddress, error: checkError } = await supabaseAdmin
      .from("user_addresses")
      .select("id, user_id")
      .eq("id", addressId)
      .single();

    if (checkError || !existingAddress || existingAddress.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("user_addresses")
      .delete()
      .eq("id", addressId);

    if (deleteError) {
      return res.status(400).json({
        success: false,
        message: deleteError.message || "Failed to delete address",
      });
    }

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PUT /api/users/addresses/:addressId/set-primary
 * Set an address as primary
 */
router.put("/addresses/:addressId/set-primary", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { addressId } = req.params;

    // Get user record
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify address belongs to user
    const { data: existingAddress, error: checkError } = await supabaseAdmin
      .from("user_addresses")
      .select("id, user_id")
      .eq("id", addressId)
      .single();

    if (checkError || !existingAddress || existingAddress.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Unset all other primary addresses
    await supabaseAdmin
      .from("user_addresses")
      .update({ is_primary: false })
      .eq("user_id", user.id)
      .neq("id", addressId);

    // Set this address as primary
    const { data: address, error: updateError } = await supabaseAdmin
      .from("user_addresses")
      .update({ is_primary: true })
      .eq("id", addressId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message || "Failed to set primary address",
      });
    }

    res.json({
      success: true,
      address,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

