/**
 * Orders API Routes
 * 
 * Handles order creation and management
 */

import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { cache } from "../services/redis.js";
import { sendEmail } from "../services/email.js";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";

// In ESM modules, __dirname is not available by default, so we reconstruct it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * Middleware to authenticate and extract user info from JWT token
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
      (req as any).userEmail = decoded.email;
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
 * Middleware to check if user is admin
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole;
  if (userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

/**
 * GET /api/orders
 * Get all orders (for admin panel)
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from("orders")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          address1,
          address2,
          city,
          province,
          zip,
          country_code
        )
      `)
      .order("created_at", { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      throw ordersError;
    }

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order: any) => {
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        // Extract user object from users array (Supabase returns as array)
        const user = Array.isArray(order.users) ? order.users[0] : order.users;

        return {
          ...order,
          users: user || null,
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
    console.error("Error fetching orders:", error);
    next(error);
  }
});

/**
 * Request body interface for order creation
 */
interface CreateOrderRequest {
  userId?: string; // Optional - auth user ID if logged in
  userEmail: string;
  userName: string;
  lineItems: Array<{
    variantId?: string; // Optional - can look up by productId + size + color
    productId: string; // Required if variantId not provided
    size?: string; // Required if variantId not provided
    color?: string; // Required if variantId not provided
    quantity: number;
    price: number; // Unit price
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    zip: string;
    countryCode?: string;
  };
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  codFee?: number;
  totalAmount: number;
  gateway: "COD" | "Prepaid"; // Payment gateway
}

/**
 * POST /api/orders
 * Create a new order
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    console.log(`[ORDER] [${new Date().toISOString()}] Step 1: Initiate order creation`);
    console.log(`[ORDER] [${new Date().toISOString()}] Request received:`, {
      userEmail: req.body.userEmail,
      userName: req.body.userName,
      gateway: req.body.gateway,
      lineItemsCount: req.body.lineItems?.length || 0,
      totalAmount: req.body.totalAmount,
    });

    const orderData: CreateOrderRequest = req.body;

    // Validate required fields
    console.log(`[ORDER] [${new Date().toISOString()}] Step 2: Validating request fields`);
    if (
      !orderData.userEmail ||
      !orderData.userName ||
      !orderData.lineItems ||
      orderData.lineItems.length === 0 ||
      !orderData.shippingAddress ||
      !orderData.totalAmount
    ) {
      console.error(`[ORDER] [${new Date().toISOString()}] ❌ Validation failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate gateway
    if (orderData.gateway !== "COD" && orderData.gateway !== "Prepaid") {
      console.error(`[ORDER] [${new Date().toISOString()}] ❌ Invalid gateway: ${orderData.gateway}`);
      return res.status(400).json({
        success: false,
        message: "Gateway must be 'COD' or 'Prepaid'",
      });
    }
    console.log(`[ORDER] [${new Date().toISOString()}] ✅ Validation passed`);
    console.log(`[ORDER] [${new Date().toISOString()}] Payment gateway: ${orderData.gateway}`);

    // Generate order number
    console.log(`[ORDER] [${new Date().toISOString()}] Step 3: Generating order number`);
    const orderNumber = await generateOrderNumber();
    console.log(`[ORDER] [${new Date().toISOString()}] ✅ Generated order number: ${orderNumber}`);

    // Step 1: Find or create user in users table (upsert - update only missing fields)
    let userId: string | null = null;
    let existingUser: any = null;
    
    if (orderData.userId) {
      // User is authenticated - try to find existing user by auth_user_id
      const { data: userByAuthId } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("auth_user_id", orderData.userId)
        .single();
      
      if (userByAuthId) {
        existingUser = userByAuthId;
        userId = userByAuthId.id;
        console.log(`👤 Found existing user by auth_user_id: ${userId}`);
      }
    }
    
    // If not found, try to find by email
    if (!userId) {
      const { data: userByEmail } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", orderData.userEmail)
        .single();
      
      if (userByEmail) {
        existingUser = userByEmail;
        userId = userByEmail.id;
        console.log(`👤 Found existing user by email: ${userId}`);
      }
    }
    
    if (existingUser && userId) {
      // Update only missing/null fields (Option A: update only missing details)
      const updateData: any = {};
      
      if (!existingUser.phone && orderData.shippingAddress.phone) {
        updateData.phone = orderData.shippingAddress.phone;
      }
      if (!existingUser.first_name && orderData.shippingAddress.firstName) {
        updateData.first_name = orderData.shippingAddress.firstName;
      }
      if (!existingUser.last_name && orderData.shippingAddress.lastName) {
        updateData.last_name = orderData.shippingAddress.lastName || "";
      }
      if (!existingUser.address1 && orderData.shippingAddress.address1) {
        updateData.address1 = orderData.shippingAddress.address1;
      }
      if (!existingUser.address2 && orderData.shippingAddress.address2) {
        updateData.address2 = orderData.shippingAddress.address2;
      }
      if (!existingUser.city && orderData.shippingAddress.city) {
        updateData.city = orderData.shippingAddress.city;
      }
      if (!existingUser.province && orderData.shippingAddress.province) {
        updateData.province = orderData.shippingAddress.province;
      }
      if (!existingUser.zip && orderData.shippingAddress.zip) {
        updateData.zip = orderData.shippingAddress.zip;
      }
      if (!existingUser.country_code && orderData.shippingAddress.countryCode) {
        updateData.country_code = orderData.shippingAddress.countryCode;
      }
      // Link auth_user_id if user is authenticated and it's not set
      if (orderData.userId && !existingUser.auth_user_id) {
        updateData.auth_user_id = orderData.userId;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update(updateData)
          .eq("id", userId);
        
        if (updateError) {
          console.error("Error updating user:", updateError);
          // Continue anyway - don't fail order creation
        } else {
          console.log(`👤 Updated user ${userId} with missing fields:`, Object.keys(updateData));
        }
      }
    } else {
      // Create new user record
      const { data: newUser, error: userError } = await supabaseAdmin
        .from("users")
        .insert({
          auth_user_id: orderData.userId || null,
          first_name: orderData.shippingAddress.firstName,
          last_name: orderData.shippingAddress.lastName || "",
          email: orderData.shippingAddress.email,
          phone: orderData.shippingAddress.phone || null,
          address1: orderData.shippingAddress.address1,
          address2: orderData.shippingAddress.address2 || null,
          city: orderData.shippingAddress.city,
          province: orderData.shippingAddress.province || null,
          zip: orderData.shippingAddress.zip,
          country_code: orderData.shippingAddress.countryCode || "IN",
          type: "shipping",
        })
        .select("id")
        .single();
      
      if (userError || !newUser) {
        console.error("Error creating user:", userError);
        throw new Error("Failed to create user record");
      }
      
      userId = newUser.id;
      console.log(`👤 Created new user: ${userId}`);
    }

    // Decide which email to use for order communications:
    // - Prefer the registered user email when available
    // - Fall back to the email provided during checkout (guest or logged-in)
    const orderUserEmail =
      (existingUser && existingUser.email) || orderData.userEmail;
    
    // Step 2: Validate line items and fetch product details
    if (!orderData.lineItems || orderData.lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one line item is required",
      });
    }

    // Validate each line item has required fields
    for (const item of orderData.lineItems) {
      if (!item.productId || !item.size || !item.color) {
        return res.status(400).json({
          success: false,
          message: "Each line item must have productId, size, and color",
        });
      }
    }

    // Fetch product details for order items
    const productIds = [...new Set(orderData.lineItems.map((item) => item.productId))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      // Include fulfillment_partner so we can auto-wire it onto the order
      .select("id, title, variants, color, fulfillment_partner")
      .in("id", productIds);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      throw new Error("Failed to fetch products");
    }
    
    const productMap = new Map(products?.map((p) => [p.id, p.title]) || []);
    
    // Validate that sizes and colors exist in product variants,
    // and collect fulfillment partners used in this order
    const fulfillmentPartners = new Set<string>();

    for (const item of orderData.lineItems) {
      const product = products?.find((p) => p.id === item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }
      
      const variants = product.variants || { sizes: [] };
      const availableSizes = variants.sizes || [];
      
      if (!availableSizes.includes(item.size)) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} is not available for product ${product.title}. Available sizes: ${availableSizes.join(', ')}`,
        });
      }
      
      if (product.color != null && product.color !== '' && item.color !== product.color) {
        return res.status(400).json({
          success: false,
          message: `Color ${item.color} does not match product ${product.title} (${product.color}).`,
        });
      }

      // Track fulfillment partner for this product, if any
      if (product.fulfillment_partner) {
        fulfillmentPartners.add(product.fulfillment_partner);
      }
    }

    // Decide auto-wired fulfillment partner for the order:
    // - If all items share the same non-null partner, auto-set that on the order
    // - If there are multiple partners or none, leave null so admin can choose manually
    let orderFulfillmentPartner: string | null = null;
    if (fulfillmentPartners.size === 1) {
      orderFulfillmentPartner = Array.from(fulfillmentPartners)[0];
      console.log(
        `[ORDER] [${new Date().toISOString()}] Auto-wired fulfillment partner for order ${orderNumber}:`,
        orderFulfillmentPartner
      );
    } else if (fulfillmentPartners.size > 1) {
      console.log(
        `[ORDER] [${new Date().toISOString()}] Multiple fulfillment partners detected in order ${orderNumber}; leaving order.fulfillment_partner null for manual selection`
      );
    }

    // Step 3.5: Derive tax and subtotal from total amount for reporting/analytics
    // Prices are stored as tax-inclusive at the line item level.
    // GST slab is applied PER ITEM (unit price), not on the overall order total:
    // - Up to ₹2,500 (inclusive) per item → 5% GST
    // - Above ₹2,500 per item → 18% GST
    //
    // We reverse-calculate GST per line item, then sum across the order.
    let itemsTotal = 0;
    let totalNetAmount = 0;
    let totalTaxAmount = 0;

    const determineGstRateForUnit = (unitPrice: number) => {
      if (unitPrice <= 2500) {
        return 0.05;
      }
      return 0.18;
    };

    for (const item of orderData.lineItems) {
      const lineTotal = item.price * item.quantity; // tax-inclusive line total
      itemsTotal += lineTotal;

      const gstRate = determineGstRateForUnit(item.price);
      const lineNet = lineTotal / (1 + gstRate);
      const lineTax = lineTotal - lineNet;

      totalNetAmount += lineNet;
      totalTaxAmount += lineTax;
    }

    const codFee = typeof orderData.codFee === "number" ? orderData.codFee : 0;
    const shippingCost =
      typeof orderData.shippingCost === "number" ? orderData.shippingCost : 0;

    // Original tax-inclusive total before any discounts (for reporting)
    const originalTotal = itemsTotal + shippingCost + codFee;

    // Prefer totalAmount from client (already includes any discounts),
    // and fall back to server-side recomputation if missing.
    const totalAmountFromClient =
      typeof orderData.totalAmount === "number" && orderData.totalAmount > 0
        ? orderData.totalAmount
        : originalTotal;

    const discountAmount = Math.max(0, originalTotal - totalAmountFromClient);

    // Step 4: Create order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId, // Reference to users table
        user_email: orderUserEmail,
        user_name: orderData.userName,
        status: "pending",
        // Store derived values for admin/accounting; customer sees only tax-inclusive total.
        subtotal: Math.round(totalNetAmount),
        tax_amount: Math.round(totalTaxAmount),
        shipping_cost: shippingCost,
        cod_fee: codFee,
        discount_amount: Math.round(discountAmount),
        total_amount: Math.round(totalAmountFromClient),
        payment_status: "pending", // Always start as pending, will be updated after payment verification
        gateway: orderData.gateway,
        // Auto-wired fulfillment partner based on products in the order (may be null)
        fulfillment_partner: orderFulfillmentPartner,
      })
      .select()
      .single();

    if (orderError) {
      console.error(`[ORDER] [${new Date().toISOString()}] ❌ Error creating order:`, orderError);
      throw new Error("Failed to create order in database");
    }

    console.log(`[ORDER] [${new Date().toISOString()}] ✅ Order created in database:`, {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      gateway: order.gateway,
      total_amount: order.total_amount,
    });

    // Step 3: Create order items in database
    console.log(`[ORDER] [${new Date().toISOString()}] Step 6: Creating order items (Count: ${orderData.lineItems.length})`);
    const orderItemsData = orderData.lineItems.map((item) => {
      return {
        order_id: order.id,
        product_id: item.productId,
        product_name: productMap.get(item.productId) || "Unknown Product",
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      };
    });

    const { error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsData);

    if (orderItemsError) {
      console.error(`[ORDER] [${new Date().toISOString()}] ❌ Error creating order items:`, orderItemsError);
      // Try to clean up the order
      console.log(`[ORDER] [${new Date().toISOString()}] Attempting to cleanup order: ${order.id}`);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Failed to create order items");
    }

    console.log(`[ORDER] [${new Date().toISOString()}] ✅ Order items created successfully`);

    // Send order confirmation emails (non-blocking)
    try {
      await Promise.all([
        sendEmail({
          intent: "order_confirmation_customer",
          // For customers, always use the order's user_email which is derived
          // from either the registered account email or the checkout email.
          to: order.user_email,
          data: {
            order,
            items: orderItemsData,
          },
        }),
        sendEmail({
          // For admin notifications, recipients can be resolved dynamically
          // from the user_profiles table or fallback admin config in the
          // email service, so we omit `to` here.
          intent: "order_confirmation_admin",
          data: {
            order,
            items: orderItemsData,
          },
        }),
      ]);
    } catch (emailError) {
      console.error(
        `[ORDER] [${new Date().toISOString()}] ⚠️ Failed to send order confirmation emails:`,
        emailError
      );
    }

    // Invalidate best-sellers cache so it refreshes with new order data
    console.log(`[ORDER] [${new Date().toISOString()}] Invalidating best-sellers cache`);
    try {
      await cache.del('orders:last30days');
      console.log(`[ORDER] [${new Date().toISOString()}] ✅ Cache invalidated successfully`);
    } catch (cacheError) {
      console.error(`[ORDER] [${new Date().toISOString()}] ⚠️  Cache invalidation failed:`, cacheError);
      // Don't fail the order if cache invalidation fails
    }

    const responseData: any = {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        shipping_cost: order.shipping_cost,
        payment_status: order.payment_status,
        gateway: order.gateway,
        created_at: order.created_at,
      },
      message: orderData.gateway === "COD" 
        ? "Order created successfully. Payment pending (COD)."
        : "Order created successfully. Please complete payment.",
      items_count: orderItemsData.length,
    };

    const duration = Date.now() - startTime;
    console.log(`[ORDER] [${new Date().toISOString()}] ✅ Step 7: Order creation complete (Duration: ${duration}ms)`);
    console.log(`[ORDER] [${new Date().toISOString()}] Order Summary:`, {
      order_number: order.order_number,
      total_items: orderItemsData.length,
      total_amount: order.total_amount,
      payment_gateway: order.gateway,
      payment_status: order.payment_status,
    });
    console.log(`[ORDER] [${new Date().toISOString()}] Success response:`, JSON.stringify(responseData, null, 2));

    // If Prepaid, the frontend will need to call /api/payments/create-order separately
    // We don't create the Razorpay order here to keep separation of concerns

    return res.status(201).json(responseData);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[ORDER] [${new Date().toISOString()}] ❌ Error creating order (Duration: ${duration}ms):`, error);
    console.error(`[ORDER] [${new Date().toISOString()}] Error stack:`, error.stack);
    next(error);
  }
});

/**
 * GET /api/orders/:orderNumber
 * Get order details by order number (supports logged in users and guest lookup with email query param)
 */
router.get(
  "/:orderNumber",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderNumber } = req.params;
      const { email } = req.query; // Optional email for guest lookup

      // Try to authenticate (optional for guest lookup)
      let userId: string | null = null;
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        try {
          const jwt = (await import("jsonwebtoken")).default;
          const { config } = await import("../config/index.js");
          const decoded = jwt.verify(token, config.jwt.secret) as {
            userId: string;
            email: string;
            role: string;
          };
          userId = decoded.userId;
        } catch {
          // Invalid token, continue as guest
        }
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .single();

      if (orderError || !order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Authorization check
      let hasAccess = false;

      if (userId) {
        // Logged in user - check if order belongs to them
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("auth_user_id", userId)
          .single();

        if (user && order.user_id === user.id) {
          hasAccess = true;
        }
      }

      if (!hasAccess && email) {
        // Guest lookup - verify email matches order
        if (order.user_email.toLowerCase() === (email as string).toLowerCase()) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Please provide email query parameter for guest orders or log in.",
        });
      }

      // Get order items
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (itemsError) {
        throw itemsError;
      }

      // Get payment details if exists
      let payment = null;
      if (order.payment_id) {
        const { data: paymentData } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("id", order.payment_id)
          .single();

        payment = paymentData;
      }

      // Get user details
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", order.user_id)
        .single();

      return res.json({
        success: true,
        order: {
          ...order,
          items: orderItems || [],
          payment,
          user: user || null,
        },
      });
    } catch (error: any) {
      console.error("Error fetching order:", error);
      next(error);
    }
  }
);

/**
 * GET /api/orders/:orderNumber/invoice
 * Generate and download invoice PDF for an order.
 *
 * - Customers: available only when order status is 'delivered'
 * - Admins: available for any order status
 * - Guests must provide ?email=query param matching order.user_email
 */
router.get(
  "/:orderNumber/invoice",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderNumber } = req.params;
      const { email } = req.query;

      // Try to authenticate (optional)
      let authUserId: string | null = null;
      let authRole: string | null = null;
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as {
            userId: string;
            email: string;
            role?: string;
          };
          authUserId = decoded.userId;
          authRole = decoded.role || "user";
        } catch {
          // Invalid token - treat as guest
        }
      }

      // Fetch order directly from DB (source of truth)
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .single();

      if (orderError || !order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Authorization / visibility
      const isAdmin = authRole === "admin";
      let hasAccess = false;

      if (isAdmin) {
        hasAccess = true;
      } else if (authUserId) {
        // Logged in user - check if order belongs to them
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("auth_user_id", authUserId)
          .single();

        if (user && order.user_id === user.id) {
          hasAccess = true;
        }
      }

      if (!hasAccess && email) {
        // Guest lookup - verify email matches order
        if (
          order.user_email.toLowerCase() ===
          (email as string).toLowerCase()
        ) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Please provide email query parameter for guest orders or log in.",
        });
      }

      // For non-admins, only allow invoice after delivery
      if (!isAdmin && order.status !== "delivered") {
        return res.status(400).json({
          success: false,
          message: "Invoice is available only after the order is delivered.",
        });
      }

      // Fetch order items
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (itemsError) {
        throw itemsError;
      }

      // Fetch shipping address if present (legacy per-order addresses table)
      const { data: addresses } = await supabaseAdmin
        .from("addresses")
        .select("*")
        .eq("order_id", order.id)
        .eq("type", "shipping")
        .limit(1);

      const shippingAddress =
        addresses && addresses.length > 0 ? addresses[0] : null;

      // Fetch user profile-based address via user_id (current source of truth)
      let userAddress: any = null;
      if (order.user_id) {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select(
            "first_name, last_name, phone, address1, address2, city, province, zip, country_code"
          )
          .eq("id", order.user_id)
          .single();

        if (user) {
          userAddress = user;
        }
      }

      // Invoice metadata
      const invoiceNumber = order.order_number;
      const invoiceDate = new Date(order.created_at);

      // Business details - placeholders for now
      const businessName = "Luxe Threads";
      const businessAddress =
        "Business Address Line 1\nCity, State, PIN\nIndia";
      const gstinPlaceholder = "GSTIN: To be updated (placeholder)";

      const doc = new PDFDocument({ size: "A4", margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"Invoice-${invoiceNumber}.pdf\"`
      );

      doc.pipe(res);

      // HEADER
      const leftX = doc.page.margins.left;
      const rightColWidth = 200;
      const rightX = doc.page.width - doc.page.margins.right - rightColWidth;
      let headerTopY = 40;

      // Brand logo at top (optional – if file missing, fall back to text-only header)
      try {
        // Use a backend-local assets folder for invoice branding so we are
        // independent of the frontend build/public paths.
        // Place the logo at: backend/assets/invoice-logo.png
        const logoPath = path.resolve(__dirname, "../assets/invoice-logo.png");
        console.log(`[INVOICE] Attempting to load logo from: ${logoPath}`);
        console.log(`[INVOICE] Logo file exists: ${fs.existsSync(logoPath)}`);

        if (fs.existsSync(logoPath)) {
          const logoWidth = 120;
          const contentWidth =
            doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const logoX =
            doc.page.margins.left + (contentWidth - logoWidth) / 2;

          doc.image(logoPath, logoX, headerTopY, { width: logoWidth });
          // Add generous spacing below the centered logo before text content
          headerTopY += 90;
          console.log(`[INVOICE] ✅ Logo loaded successfully, centered at x=${logoX}`);
        } else {
          console.log(
            `[INVOICE] ⚠️ Logo file not found, using text-only header`
          );
        }
      } catch (err) {
        console.error(`[INVOICE] ❌ Error loading logo:`, err);
        // No-op if logo file not found
      }

      // Business name and address, nicely spaced below logo (or top margin)
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(businessName, leftX, headerTopY, {
          width:
            doc.page.width -
            doc.page.margins.left -
            doc.page.margins.right -
            rightColWidth -
            10,
        });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").text(businessAddress, leftX);
      doc.moveDown(0.3);
      doc.text(gstinPlaceholder, leftX);

      // Invoice meta (right side)
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("INVOICE", rightX, headerTopY, {
          width: rightColWidth,
          align: "right",
        });
      doc.fontSize(10).font("Helvetica").moveDown(0.5);
      doc.text(`Invoice No: ${invoiceNumber}`, rightX, doc.y, {
        width: rightColWidth,
        align: "right",
      });
      doc.text(
        `Invoice Date: ${invoiceDate.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}`,
        rightX,
        doc.y,
        { width: rightColWidth, align: "right" }
      );
      doc.text(`Order Status: ${order.status}`, rightX, doc.y, {
        width: rightColWidth,
        align: "right",
      });
      doc.text(`Payment Method: ${order.gateway}`, rightX, doc.y, {
        width: rightColWidth,
        align: "right",
      });

      doc.moveDown(1.5);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();

      // BILL TO
      doc.moveDown(1);
      doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", leftX);
      doc.moveDown(0.3);

      // Prefer user profile address; fall back to per-order shippingAddress; finally order.user_name/email
      const billingSource = userAddress || shippingAddress || null;

      const customerName =
        billingSource?.first_name && billingSource?.last_name
          ? `${billingSource.first_name} ${billingSource.last_name}`
          : order.user_name;

      doc.fontSize(10).font("Helvetica");
      doc.text(customerName, leftX);
      if (billingSource) {
        if (billingSource.address1) {
          doc.text(billingSource.address1, leftX);
        }
        if (billingSource.address2) {
          doc.text(billingSource.address2, leftX);
        }
        const cityLineParts = [
          billingSource.city,
          billingSource.province || "",
          billingSource.zip || "",
        ].filter(Boolean);
        if (cityLineParts.length) {
          doc.text(cityLineParts.join(", "), leftX);
        }
        const countryLabel = billingSource.country_code || "IN";
        doc.text(countryLabel === "IN" ? "India" : countryLabel, leftX);
        if (billingSource.phone) {
          doc.text(`Phone: ${billingSource.phone}`, leftX);
        }
      }
      doc.text(`Email: ${order.user_email}`, leftX);

      doc.moveDown(1);

      // ITEMS TABLE HEADER
      const tableTop = doc.y;
      const tableWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidths = {
        product: 140,
        variant: 100,
        qty: 30,
        unit: 60,
        gstRate: 45,
        gstAmt: 60,
        total: 60,
      };
      const colProductX = leftX;
      const colVariantX = colProductX + colWidths.product;
      const colQtyX = colVariantX + colWidths.variant;
      const colUnitPriceX = colQtyX + colWidths.qty;
      const colGstRateX = colUnitPriceX + colWidths.unit;
      const colGstAmtX = colGstRateX + colWidths.gstRate;
      const colTotalX = colGstAmtX + colWidths.gstAmt;

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Product", colProductX, tableTop, {
        width: colWidths.product,
      });
      doc.text("Variant", colVariantX, tableTop, {
        width: colWidths.variant,
      });
      doc.text("Qty", colQtyX, tableTop, {
        width: colWidths.qty,
        align: "center",
      });
      doc.text("Unit Price", colUnitPriceX, tableTop + 2, {
        width: colWidths.unit,
        align: "center",
      });
      doc.text("GST %", colGstRateX, tableTop + 2, {
        width: colWidths.gstRate,
        align: "center",
      });
      doc.text("GST Amt", colGstAmtX, tableTop + 2, {
        width: colWidths.gstAmt,
        align: "center",
      });
      doc.text("Line Total", colTotalX, tableTop, {
        width: colWidths.total,
        align: "center",
      });

      doc.moveDown(0.5);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();

      // ITEMS ROWS
      doc.fontSize(9).font("Helvetica");
      let currentY = doc.y + 6;

      const formatMoney = (value: number) => {
        const amount = Math.round(value || 0);
        return `Rs. ${amount.toLocaleString("en-IN")}`;
      };

      for (const item of orderItems || []) {
        const unitPrice = Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 0;
        const lineTotal =
          Number(item.total_price) || Math.round(unitPrice * quantity);

        // GST rate logic: same as used when creating the order
        const gstRate = unitPrice <= 2500 ? 0.05 : 0.18;
        const unitNet = unitPrice / (1 + gstRate);
        const unitGst = unitPrice - unitNet;
        const lineGst = unitGst * quantity;

        // Page break handling
        if (currentY > doc.page.height - doc.page.margins.bottom - 60) {
          doc.addPage();
          currentY = doc.page.margins.top;
        }

        // Variant (size/color)
        const variantParts: string[] = [];
        if (item.size) variantParts.push(`Size: ${item.size}`);
        if (item.color) variantParts.push(`Color: ${item.color}`);
        const variantText = variantParts.join("\n");

        // Measure row height based on wrapped text
        const productText = item.product_name || "Product";
        const productHeight = doc.heightOfString(productText, {
          width: colWidths.product,
        });
        const variantHeight = doc.heightOfString(variantText || "-", {
          width: colWidths.variant,
        });
        const rowHeight = Math.max(productHeight, variantHeight, 14);

        // Product name
        doc.text(productText, colProductX, currentY, {
          width: colWidths.product,
        });

        // Variant
        doc.text(variantText || "-", colVariantX, currentY, {
          width: colWidths.variant,
        });

        // Quantity
        doc.text(String(quantity), colQtyX, currentY, {
          width: colWidths.qty,
          align: "center",
        });

        // Unit price (incl. GST)
        doc.text(formatMoney(unitPrice), colUnitPriceX, currentY, {
          width: colWidths.unit,
          align: "center",
        });

        // GST rate
        doc.text(`${(gstRate * 100).toFixed(0)}%`, colGstRateX, currentY, {
          width: colWidths.gstRate,
          align: "center",
        });

        // GST amount
        doc.text(formatMoney(lineGst), colGstAmtX, currentY, {
          width: colWidths.gstAmt,
          align: "center",
        });

        // Line total
        doc.text(formatMoney(lineTotal), colTotalX, currentY, {
          width: colWidths.total,
          align: "center",
        });

        currentY += rowHeight + 6;
      }

      doc
        .moveTo(doc.page.margins.left, currentY + 4)
        .lineTo(doc.page.width - doc.page.margins.right, currentY + 4)
        .stroke();

      // SUMMARY
      const summaryTop = currentY + 16;
      // Summary box on the right side with fixed width
      const summaryBoxWidth = 220;
      const summaryBoxX =
        doc.page.width - doc.page.margins.right - summaryBoxWidth;
      const summaryLabelWidth = 120;
      const summaryValueWidth = summaryBoxWidth - summaryLabelWidth;

      const subtotal = Number(order.subtotal) || 0;
      const taxAmount = Number(order.tax_amount) || 0;
      const codFee = Number(order.cod_fee) || 0;
      const discountAmount = Number(order.discount_amount) || 0;
      const totalAmount = Number(order.total_amount) || 0;

      doc.fontSize(10).font("Helvetica");

      let currentSummaryY = summaryTop;

      // Subtotal
      doc.text("Subtotal (excl. GST)", summaryBoxX, currentSummaryY, {
        width: summaryLabelWidth,
        align: "right",
      });
      doc.text(formatMoney(subtotal), summaryBoxX + summaryLabelWidth, currentSummaryY, {
        width: summaryValueWidth,
        align: "right",
      });

      currentSummaryY += 14;

      // GST total
      doc.text("GST Total", summaryBoxX, currentSummaryY, {
        width: summaryLabelWidth,
        align: "right",
      });
      doc.text(formatMoney(taxAmount), summaryBoxX + summaryLabelWidth, currentSummaryY, {
        width: summaryValueWidth,
        align: "right",
      });

      currentSummaryY += 14;

      // Discount (if any)
      if (discountAmount > 0) {
        doc.text("Discount", summaryBoxX, currentSummaryY, {
          width: summaryLabelWidth,
          align: "right",
        });
        doc.text(`- ${formatMoney(discountAmount)}`, summaryBoxX + summaryLabelWidth, currentSummaryY, {
          width: summaryValueWidth,
          align: "right",
        });
        currentSummaryY += 14;
      }

      // COD Fee (only if gateway is COD and fee > 0)
      if (codFee > 0 && order.gateway === "COD") {
        doc.text("COD Fee", summaryBoxX, currentSummaryY, {
          width: summaryLabelWidth,
          align: "right",
        });
        doc.text(formatMoney(codFee), summaryBoxX + summaryLabelWidth, currentSummaryY, {
          width: summaryValueWidth,
          align: "right",
        });
        currentSummaryY += 14;
      }

      // Total amount
      doc.font("Helvetica-Bold");
      doc.text("Total Amount", summaryBoxX, currentSummaryY, {
        width: summaryLabelWidth,
        align: "right",
      });
      doc.text(formatMoney(totalAmount), summaryBoxX + summaryLabelWidth, currentSummaryY, {
        width: summaryValueWidth,
        align: "right",
      });

      // FOOTER
      doc.moveDown(4);
      doc.fontSize(8).font("Helvetica");
      const footerWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.text(
        "This is a system-generated invoice for your order at Luxe Threads. GST details will be updated once registration is complete.",
        doc.page.margins.left,
        doc.y,
        {
          width: footerWidth,
          align: "center",
        }
      );
      doc.moveDown(0.5);
      doc.text("Thank you for shopping with us!", doc.page.margins.left, doc.y, {
        width: footerWidth,
        align: "center",
      });

      doc.end();
    } catch (error: any) {
      console.error("Error generating invoice PDF:", error);
      next(error);
    }
  }
);

/**
 * POST /api/orders/lookup
 * Guest order lookup by order number and email
 */
router.post("/lookup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber, email } = req.body;

    if (!orderNumber || !email) {
      return res.status(400).json({
        success: false,
        message: "Order number and email are required",
      });
    }

    // Get order by order number
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify email matches
    if (order.user_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Email does not match this order",
      });
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (itemsError) {
      throw itemsError;
    }

    // Get payment details if exists
    let payment = null;
    if (order.payment_id) {
      const { data: paymentData } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("id", order.payment_id)
        .single();

      payment = paymentData;
    }

    // Get user details
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", order.user_id)
      .single();

    res.json({
      success: true,
      order: {
        ...order,
        items: orderItems || [],
        payment,
        user: userData || null,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PUT /api/orders/:orderNumber/status
 * Update order status (admin only)
 */
router.put("/:orderNumber/status", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const { status, notes, shipping_partner, tracking_number, tracking_url } = req.body;
    const userId = (req as any).userId;
    const userEmail = (req as any).userEmail;

    // Validate status
    const validStatuses = ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Fetch the order first (needed for validation)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Validate tracking info when status is being set to "shipped"
    // (Allow updates to existing "shipped" orders without requiring tracking info if status isn't changing)
    if (status === 'shipped' && order.status !== 'shipped') {
      // At least one tracking field should be provided when changing TO "shipped"
      if (!shipping_partner && !tracking_number && !tracking_url) {
        return res.status(400).json({
          success: false,
          message: "Shipping partner, tracking number, or tracking URL is required when status is 'shipped'",
        });
      }
    }

    // Don't update if status is the same AND no tracking info is being updated
    const hasTrackingInfo = shipping_partner || tracking_number || tracking_url;
    if (order.status === status && !hasTrackingInfo) {
      return res.status(400).json({
        success: false,
        message: "Order already has this status and no tracking info provided",
      });
    }

    const oldStatus = order.status;

    // Get user name for audit log
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const changedByName = profile?.name || userEmail?.split("@")[0] || "Admin";

    // Prepare update data
    const updateData: any = {};
    
    // Only update status if it changed
    if (order.status !== status) {
      updateData.status = status;
    }
    
    // Add tracking info if status is "shipped" or "delivered" and fields are provided
    if (status === 'shipped' || status === 'delivered' || order.status === 'shipped' || order.status === 'delivered') {
      if (shipping_partner !== undefined) {
        updateData.shipping_partner = shipping_partner || null;
      }
      if (tracking_number !== undefined) {
        updateData.tracking_number = tracking_number || null;
      }
      if (tracking_url !== undefined) {
        updateData.tracking_url = tracking_url || null;
      }
    }

    // Update order status and tracking info
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order status:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
      });
    }

    // Invalidate Redis cache for this order
    try {
      const { cache } = await import("../services/redis.js");
      await cache.del(`order:${orderNumber}`);
      await cache.del('orders:last30days'); // Invalidate orders list cache
    } catch (cacheError) {
      console.error("Error invalidating cache:", cacheError);
      // Don't fail the request if cache invalidation fails
    }

    // Create status history entry
    const { error: historyError } = await supabaseAdmin
      .from("order_status_history")
      .insert({
        order_id: order.id,
        old_status: oldStatus,
        new_status: status,
        changed_by: userId,
        changed_by_name: changedByName,
        notes: notes || null,
      });

    if (historyError) {
      console.error("Error creating status history:", historyError);
      // Don't fail the request if history logging fails, but log it
    }

    // Fetch updated order with full details for email
    const { data: updatedOrder } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, shipping_partner, tracking_number, tracking_url, user_email, user_name, gateway")
      .eq("id", order.id)
      .single();

    // Send email notification to customer ONLY when status actually changes
    if (oldStatus !== status && updatedOrder) {
      try {
        // Fetch order items for email (especially important for "shipped" status)
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        await sendEmail({
          intent: "order_status_update_customer",
          to: updatedOrder.user_email,
          data: {
            order: updatedOrder,
            oldStatus,
            status: updatedOrder.status,
            items: orderItems || [],
          },
        });
        console.log(
          `[ORDER] [${new Date().toISOString()}] ✅ Sent status update email for order ${orderNumber} (${oldStatus} → ${updatedOrder.status})`
        );
      } catch (emailError) {
        console.error(
          `[ORDER] [${new Date().toISOString()}] ⚠️ Failed to send status update email:`,
          emailError
        );
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder || {
        id: order.id,
        order_number: order.order_number,
        status,
        shipping_partner: updateData.shipping_partner,
        tracking_number: updateData.tracking_number,
        tracking_url: updateData.tracking_url,
      },
    });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    next(error);
  }
});

/**
 * PUT /api/orders/:orderNumber/fulfillment-partner
 * Update order fulfillment partner (admin only)
 */
router.put("/:orderNumber/fulfillment-partner", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const { fulfillment_partner } = req.body;

    // Validate fulfillment_partner (allow null or valid values)
    if (fulfillment_partner !== null && fulfillment_partner !== undefined) {
      const validPartners = ['Qikink', 'Printrove'];
      if (!validPartners.includes(fulfillment_partner)) {
        return res.status(400).json({
          success: false,
          message: `Invalid fulfillment partner. Must be one of: ${validPartners.join(', ')}, or null`,
        });
      }
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, fulfillment_partner")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update fulfillment partner
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ fulfillment_partner: fulfillment_partner || null })
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating fulfillment partner:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to update fulfillment partner",
      });
    }

    res.json({
      success: true,
      message: "Fulfillment partner updated successfully",
      order: {
        id: order.id,
        order_number: order.order_number,
        fulfillment_partner: fulfillment_partner || null,
      },
    });
  } catch (error: any) {
    console.error("Error updating fulfillment partner:", error);
    next(error);
  }
});

/**
 * PUT /api/orders/:orderNumber/partner-order-id
 * Update order partner order ID (admin only)
 */
router.put("/:orderNumber/partner-order-id", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const { partner_order_id } = req.body;

    // Validate partner_order_id (allow null or non-empty string)
    if (partner_order_id !== null && partner_order_id !== undefined && partner_order_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Partner order ID cannot be empty. Use null to clear it.",
      });
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, fulfillment_partner")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update partner order ID
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ partner_order_id: partner_order_id ? partner_order_id.trim() : null })
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating partner order ID:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to update partner order ID",
      });
    }

    res.json({
      success: true,
      message: "Partner order ID updated successfully",
      order: {
        id: order.id,
        order_number: order.order_number,
        partner_order_id: partner_order_id ? partner_order_id.trim() : null,
      },
    });
  } catch (error: any) {
    console.error("Error updating partner order ID:", error);
    next(error);
  }
});

export default router;
