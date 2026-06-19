/**
 * Returns API Routes
 */

import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { supabaseAdmin } from "../services/supabase.js";
import {
  RETURN_REASONS,
  RETURN_STATUSES,
  RETURN_WINDOW_DAYS,
  checkReturnEligibility,
  completeReturnRefund,
  enrichReturnRow,
  generateReturnNumber,
  isWithinReturnWindow,
  notifyReturnStatusChange,
  recordReturnStatusChange,
  verifyOrderAccess,
  type ReturnStatus,
} from "../services/returns.js";
import { uploadReturnPhoto } from "../services/storage.js";

const router = Router();

function parseToken(req: Request): {
  userId: string | null;
  userRole: string | null;
  userEmail: string | null;
} {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return { userId: null, userRole: null, userEmail: null };
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      role: string;
    };
    return {
      userId: decoded.userId,
      userRole: decoded.role || "user",
      userEmail: decoded.email,
    };
  } catch {
    return { userId: null, userRole: null, userEmail: null };
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = parseToken(req);
  if (!auth.userId && !req.body?.email && !req.query?.email) {
    return res.status(401).json({
      success: false,
      message: "Authentication or email required",
    });
  }
  (req as any).auth = auth;
  next();
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = parseToken(req);
  if (!auth.userId || auth.userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  (req as any).auth = auth;
  next();
}

/**
 * GET /api/returns/eligibility/:orderNumber
 * Check which line items can be returned
 */
router.get(
  "/eligibility/:orderNumber",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderNumber } = req.params;
      const email = (req.query.email as string) || undefined;
      const auth = parseToken(req);

      const { order, hasAccess } = await verifyOrderAccess(orderNumber, {
        userId: auth.userId,
        email,
        userRole: auth.userRole || undefined,
        requireAdmin: auth.userRole === "admin",
      });

      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const deliveredAt = order.delivered_at || order.updated_at;
      const windowOpen = order.status === "delivered" && isWithinReturnWindow(deliveredAt);

      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      const eligibility = await Promise.all(
        (items || []).map(async (item) => {
          const check = windowOpen
            ? await checkReturnEligibility(order.id, item.id)
            : {
                eligible: false,
                reason:
                  order.status !== "delivered"
                    ? "Order not yet delivered"
                    : `Return window is ${RETURN_WINDOW_DAYS} days from delivery`,
              };
          return {
            order_item_id: item.id,
            product_name: item.product_name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unit_price: item.unit_price,
            ...check,
          };
        })
      );

      res.json({
        success: true,
        order_number: order.order_number,
        status: order.status,
        delivered_at: order.delivered_at,
        return_window_days: RETURN_WINDOW_DAYS,
        items: eligibility,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/returns
 * Create a return request
 */
router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth as ReturnType<typeof parseToken>;
    const {
      order_number,
      order_item_id,
      type,
      reason,
      reason_detail,
      exchange_size,
      exchange_color,
      quantity = 1,
      photo_urls = [],
      email,
    } = req.body;

    if (!order_number || !order_item_id || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: "order_number, order_item_id, type, and reason are required",
      });
    }

    if (!["refund", "exchange"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid return type" });
    }

    if (!RETURN_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: "Invalid reason" });
    }

    if (type === "exchange" && !exchange_size?.trim()) {
      return res.status(400).json({
        success: false,
        message: "exchange_size is required for exchanges",
      });
    }

    const lookupEmail = email || auth.userEmail;
    const { order, hasAccess } = await verifyOrderAccess(order_number, {
      userId: auth.userId,
      email: lookupEmail,
      userRole: auth.userRole || undefined,
    });

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const eligibility = await checkReturnEligibility(order.id, order_item_id);
    if (!eligibility.eligible) {
      return res.status(400).json({ success: false, message: eligibility.reason });
    }

    const { data: orderItem } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("id", order_item_id)
      .single();

    if (!orderItem) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }

    const qty = Math.min(Math.max(1, Number(quantity)), orderItem.quantity);
    const refundAmount = Number(orderItem.unit_price) * qty;

    const { data: created, error } = await supabaseAdmin
      .from("return_requests")
      .insert({
        order_id: order.id,
        order_item_id,
        type,
        status: "pending_review",
        reason,
        reason_detail: reason_detail?.trim() || null,
        exchange_size: exchange_size?.trim() || null,
        exchange_color: exchange_color?.trim() || null,
        quantity: qty,
        refund_amount: refundAmount,
        photo_urls: Array.isArray(photo_urls) ? photo_urls : [],
        created_by_email: lookupEmail || order.user_email,
      })
      .select("*")
      .single();

    if (error || !created) {
      console.error("[RETURNS] Create error:", error);
      return res.status(500).json({ success: false, message: "Failed to create return request" });
    }

    await recordReturnStatusChange(created.id, null, "pending_review", created.created_by_email);

    res.status(201).json({
      success: true,
      message: "Return request submitted. We will review it shortly.",
      return: enrichReturnRow(created, order, orderItem),
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/returns/upload-photo
 * Upload a return evidence photo (base64 data URL)
 */
router.post("/upload-photo", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageData, order_number } = req.body;
    if (!imageData || typeof imageData !== "string") {
      return res.status(400).json({ success: false, message: "imageData is required" });
    }

    const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid image data URL" });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const prefix = order_number ? String(order_number).replace(/[^a-zA-Z0-9.-]/g, "_") : "return";
    const url = await uploadReturnPhoto(buffer, prefix, contentType);

    res.json({ success: true, url });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/returns/order/:orderNumber
 */
router.get("/order/:orderNumber", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const email = (req.query.email as string) || undefined;
    const auth = parseToken(req);

    const { order, hasAccess } = await verifyOrderAccess(orderNumber, {
      userId: auth.userId,
      email,
      userRole: auth.userRole || undefined,
      requireAdmin: auth.userRole === "admin",
    });

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { data: returns } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });

    res.json({ success: true, returns: returns || [] });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/returns — admin list
 */
router.get("/", requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;

    let query = supabaseAdmin
      .from("return_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && typeof status === "string") {
      query = query.eq("status", status);
    }

    const { data: returns, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (returns || []).map(async (row) => {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("order_number, status, fulfillment_partner, gateway, user_email, user_name")
          .eq("id", row.order_id)
          .single();
        const { data: orderItem } = await supabaseAdmin
          .from("order_items")
          .select("product_name, size, color, unit_price")
          .eq("id", row.order_item_id)
          .single();
        return enrichReturnRow(row, order, orderItem);
      })
    );

    res.json({ success: true, returns: enriched });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/returns/:returnNumber
 */
router.get("/:returnNumber", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { returnNumber } = req.params;
    const email = (req.query.email as string) || undefined;
    const auth = parseToken(req);

    const { data: returnRequest, error } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("return_number", returnNumber)
      .maybeSingle();

    if (error) throw error;

    let row = returnRequest;
    if (!row && returnNumber.length === 36) {
      const { data: byId } = await supabaseAdmin
        .from("return_requests")
        .select("*")
        .eq("id", returnNumber)
        .maybeSingle();
      row = byId;
    }

    if (!row) {
      return res.status(404).json({ success: false, message: "Return not found" });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", row.order_id)
      .single();

    const isAdmin = auth.userRole === "admin";
    const { hasAccess } = await verifyOrderAccess(order.order_number, {
      userId: auth.userId,
      email,
      userRole: auth.userRole || undefined,
      requireAdmin: isAdmin,
    });

    const emailMatch =
      email && row.created_by_email?.toLowerCase() === email.toLowerCase();

    if (!hasAccess && !emailMatch && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { data: orderItem } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("id", row.order_item_id)
      .single();

    const { data: history } = await supabaseAdmin
      .from("return_status_history")
      .select("*")
      .eq("return_request_id", row.id)
      .order("created_at", { ascending: true });

    res.json({
      success: true,
      return: enrichReturnRow(row, order, orderItem),
      history: history || [],
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * PUT /api/returns/:id/status — admin update
 */
router.put("/:id/status", requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth;
    const { id } = req.params;
    const {
      status,
      notes,
      return_ship_to,
      return_ship_instructions,
      rejection_reason,
      partner_claim_ref,
      partner_filed,
      manual_refund_ref,
      process_refund,
    } = req.body;

    if (!status || !RETURN_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, message: "Return not found" });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", existing.order_id)
      .single();

    const { data: orderItem } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("id", existing.order_item_id)
      .single();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const newStatus = status as ReturnStatus;

    if (newStatus === "approved" && existing.status === "pending_review") {
      updateData.return_number = existing.return_number || generateReturnNumber(order.order_number);
      updateData.approved_at = new Date().toISOString();
      if (return_ship_to) updateData.return_ship_to = return_ship_to;
      if (return_ship_instructions) updateData.return_ship_instructions = return_ship_instructions;
    }

    if (newStatus === "rejected") {
      updateData.rejection_reason = rejection_reason?.trim() || notes?.trim() || "Return request declined";
    }

    if (newStatus === "received") {
      updateData.received_at = new Date().toISOString();
    }

    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();

      if (existing.type === "refund" && process_refund !== false) {
        await completeReturnRefund(existing, order, {
          manualRefundRef: manual_refund_ref,
          adminEmail: auth.userEmail || "admin",
        });
      }
    }

    if (partner_claim_ref !== undefined) updateData.partner_claim_ref = partner_claim_ref;
    if (partner_filed !== undefined) updateData.partner_filed = Boolean(partner_filed);
    if (notes !== undefined) updateData.admin_notes = notes;
    if (return_ship_to !== undefined) updateData.return_ship_to = return_ship_to;
    if (return_ship_instructions !== undefined) {
      updateData.return_ship_instructions = return_ship_instructions;
    }

    updateData.status = newStatus;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("return_requests")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ success: false, message: "Failed to update return" });
    }

    await recordReturnStatusChange(
      id,
      existing.status,
      newStatus,
      auth.userEmail || "admin",
      notes
    );

    if (existing.status !== newStatus) {
      await notifyReturnStatusChange(updated, order, orderItem);
    }

    res.json({
      success: true,
      message: "Return updated",
      return: enrichReturnRow(updated, order, orderItem),
    });
  } catch (error: any) {
    console.error("[RETURNS] Status update error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update return",
    });
  }
});

/**
 * POST /api/returns/:id/refund — admin process Razorpay refund for a return
 */
router.post("/:id/refund", requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth;
    const { id } = req.params;
    const { manual_refund_ref } = req.body;

    const { data: returnRequest } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (!returnRequest) {
      return res.status(404).json({ success: false, message: "Return not found" });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", returnRequest.order_id)
      .single();

    await completeReturnRefund(returnRequest, order, {
      manualRefundRef: manual_refund_ref,
      adminEmail: auth.userEmail || "admin",
    });

    res.json({ success: true, message: "Refund processed" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
