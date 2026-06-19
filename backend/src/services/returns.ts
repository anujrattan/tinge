/**
 * Returns service — eligibility, RAN generation, status transitions.
 */

import { randomBytes } from "crypto";
import { supabaseAdmin } from "./supabase.js";
import { sendEmail } from "./email.js";
import { executePaymentRefund } from "./refunds.js";

export const RETURN_WINDOW_DAYS = 7;

export const RETURN_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "awaiting_shipment",
  "in_transit",
  "received",
  "completed",
  "cancelled",
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = [
  "defective",
  "wrong_item",
  "wrong_size",
  "changed_mind",
  "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

const OPEN_RETURN_STATUSES: ReturnStatus[] = [
  "pending_review",
  "approved",
  "awaiting_shipment",
  "in_transit",
  "received",
];

export function generateReturnNumber(orderNumber: string): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `RET-${orderNumber}-${suffix}`;
}

export function isWithinReturnWindow(deliveredAt: string | null | undefined): boolean {
  if (!deliveredAt) return false;
  const delivered = new Date(deliveredAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETURN_WINDOW_DAYS);
  return delivered >= cutoff;
}

export async function verifyOrderAccess(
  orderNumber: string,
  options: { userId?: string | null; email?: string | null; requireAdmin?: boolean; userRole?: string }
): Promise<{ order: any; hasAccess: boolean }> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  if (options.requireAdmin) {
    return { order, hasAccess: options.userRole === "admin" };
  }

  let hasAccess = false;

  if (options.userId) {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", options.userId)
      .single();

    if (user && order.user_id === user.id) {
      hasAccess = true;
    }
  }

  if (!hasAccess && options.email) {
    if (order.user_email.toLowerCase() === options.email.toLowerCase()) {
      hasAccess = true;
    }
  }

  return { order, hasAccess };
}

export async function checkReturnEligibility(orderId: string, orderItemId: string): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status, delivered_at, updated_at")
    .eq("id", orderId)
    .single();

  if (!order) {
    return { eligible: false, reason: "Order not found" };
  }

  if (order.status !== "delivered") {
    return { eligible: false, reason: "Returns are only available for delivered orders" };
  }

  const deliveredAt =
    order.delivered_at ||
    (order.status === "delivered" ? order.updated_at : null);

  if (!isWithinReturnWindow(deliveredAt)) {
    return {
      eligible: false,
      reason: `Return window is ${RETURN_WINDOW_DAYS} days from delivery`,
    };
  }

  const { data: shippingAddress } = await supabaseAdmin
    .from("addresses")
    .select("country_code")
    .eq("order_id", orderId)
    .eq("type", "shipping")
    .maybeSingle();

  const country = (shippingAddress?.country_code || "IN").toUpperCase();
  if (country !== "IN") {
    return { eligible: false, reason: "Returns are currently available for India orders only" };
  }

  const { data: orderItem } = await supabaseAdmin
    .from("order_items")
    .select("id, order_id, quantity")
    .eq("id", orderItemId)
    .eq("order_id", orderId)
    .single();

  if (!orderItem) {
    return { eligible: false, reason: "Order item not found" };
  }

  const { data: openReturns } = await supabaseAdmin
    .from("return_requests")
    .select("id, quantity, status")
    .eq("order_item_id", orderItemId)
    .in("status", OPEN_RETURN_STATUSES);

  const returnedQty = (openReturns || []).reduce((sum, r) => sum + (r.quantity || 0), 0);
  if (returnedQty >= orderItem.quantity) {
    return { eligible: false, reason: "A return is already in progress for this item" };
  }

  return { eligible: true };
}

export async function recordReturnStatusChange(
  returnRequestId: string,
  oldStatus: string | null,
  newStatus: string,
  changedByEmail: string,
  notes?: string | null
): Promise<void> {
  await supabaseAdmin.from("return_status_history").insert({
    return_request_id: returnRequestId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by_email: changedByEmail,
    notes: notes || null,
  });
}

export async function notifyReturnStatusChange(
  returnRequest: any,
  order: any,
  orderItem: any
): Promise<void> {
  try {
    await sendEmail({
      intent: "return_status_update_customer",
      to: returnRequest.created_by_email || order.user_email,
      data: {
        returnRequest,
        order,
        orderItem,
      },
    });
  } catch (err) {
    console.error("[RETURNS] Failed to send return status email:", err);
  }
}

export async function completeReturnRefund(
  returnRequest: any,
  order: any,
  options: { manualRefundRef?: string; adminEmail: string }
): Promise<void> {
  const refundAmount = Number(returnRequest.refund_amount || 0);
  if (refundAmount <= 0) {
    throw new Error("Invalid refund amount");
  }

  if (order.gateway === "Prepaid") {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("razorpay_payment_id, status, amount")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment?.razorpay_payment_id) {
      throw new Error("No Razorpay payment found for this order");
    }

    await executePaymentRefund({
      razorpayPaymentId: payment.razorpay_payment_id,
      amount: refundAmount,
      notes: {
        return_number: returnRequest.return_number || returnRequest.id,
        order_number: order.order_number,
      },
    });
  } else if (order.gateway === "COD") {
    if (!options.manualRefundRef?.trim()) {
      throw new Error("Manual refund reference is required for COD orders");
    }
    await supabaseAdmin
      .from("return_requests")
      .update({
        manual_refund_ref: options.manualRefundRef.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", returnRequest.id);
  } else {
    throw new Error("Unsupported payment gateway for refund");
  }
}

export function enrichReturnRow(row: any, order?: any, orderItem?: any) {
  return {
    ...row,
    order_number: order?.order_number,
    order_status: order?.status,
    fulfillment_partner: order?.fulfillment_partner,
    gateway: order?.gateway,
    product_name: orderItem?.product_name,
    size: orderItem?.size,
    color: orderItem?.color,
    unit_price: orderItem?.unit_price,
  };
}
