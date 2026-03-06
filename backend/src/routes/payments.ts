/**
 * Payment Routes
 * 
 * Handles Razorpay payment integration endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPaymentDetails,
  processRefund,
} from "../services/razorpay.js";
import { config } from "../config/index.js";

const router = Router();

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for prepaid payment
 */
interface CreateRazorpayOrderRequest {
  orderId: string;
  orderNumber: string;
  amount: number; // Amount in INR
}

router.post(
  "/create-order",
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      console.log(`[PAYMENT] [${new Date().toISOString()}] Step 1: Initiate Razorpay order creation`);
      console.log(`[PAYMENT] [${new Date().toISOString()}] Request received:`, {
        orderId: req.body.orderId,
        orderNumber: req.body.orderNumber,
        amount: req.body.amount,
      });

      const { orderId, orderNumber, amount }: CreateRazorpayOrderRequest =
        req.body;

      // Validate required fields
      console.log(`[PAYMENT] [${new Date().toISOString()}] Step 2: Validating request fields`);
      if (!orderId || !orderNumber || !amount || amount <= 0) {
        console.error(`[PAYMENT] [${new Date().toISOString()}] Validation failed: Missing required fields`);
        return res.status(400).json({
          success: false,
          message: "Missing required fields: orderId, orderNumber, and amount",
        });
      }
      console.log(`[PAYMENT] [${new Date().toISOString()}] ✅ Validation passed`);

      // Verify order exists and is pending payment
      console.log(`[PAYMENT] [${new Date().toISOString()}] Step 3: Fetching order from database (Order ID: ${orderId})`);
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, total_amount, gateway, payment_status")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error(`[PAYMENT] [${new Date().toISOString()}] ❌ Order not found:`, orderError);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
      console.log(`[PAYMENT] [${new Date().toISOString()}] ✅ Order found:`, {
        order_number: order.order_number,
        gateway: order.gateway,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
      });

      if (order.gateway !== "Prepaid") {
        console.error(`[PAYMENT] [${new Date().toISOString()}] ❌ Invalid gateway: Expected "Prepaid", got "${order.gateway}"`);
        return res.status(400).json({
          success: false,
          message: "Order is not a prepaid order",
        });
      }

      if (order.payment_status === "paid") {
        console.error(`[PAYMENT] [${new Date().toISOString()}] ❌ Order already paid`);
        return res.status(400).json({
          success: false,
          message: "Order is already paid",
        });
      }

      // Create Razorpay order
      console.log(`[PAYMENT] [${new Date().toISOString()}] Step 4: Creating Razorpay order`);
      console.log(`[PAYMENT] [${new Date().toISOString()}] Razorpay order params:`, {
        amount: amount,
        amountInPaise: Math.round(amount * 100),
        currency: "INR",
        receipt: orderNumber,
        notes: { order_id: orderId, order_number: orderNumber },
      });
      
      const razorpayOrder = await createRazorpayOrder(
        amount,
        orderNumber,
        orderId
      );

      console.log(`[PAYMENT] [${new Date().toISOString()}] ✅ Razorpay order created successfully`);
      console.log(`[PAYMENT] [${new Date().toISOString()}] Razorpay order response:`, {
        id: razorpayOrder.id,
        entity: razorpayOrder.entity,
        amount: razorpayOrder.amount,
        amount_paid: razorpayOrder.amount_paid,
        amount_due: razorpayOrder.amount_due,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        created_at: razorpayOrder.created_at,
        notes: razorpayOrder.notes,
      });

      // Store Razorpay order ID in payments table
      console.log(`[PAYMENT] [${new Date().toISOString()}] Step 5: Creating payment record in database`);
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: orderId,
          razorpay_order_id: razorpayOrder.id,
          amount: amount,
          currency: "INR",
          status: "created",
          gateway: "Prepaid",
        })
        .select()
        .single();

      if (paymentError) {
        console.error(`[PAYMENT] [${new Date().toISOString()}] ❌ Error creating payment record:`, paymentError);
        // Don't fail the request, but log the error
      } else {
        console.log(`[PAYMENT] [${new Date().toISOString()}] ✅ Payment record created:`, {
          id: payment.id,
          order_id: payment.order_id,
          razorpay_order_id: payment.razorpay_order_id,
          amount: payment.amount,
          status: payment.status,
        });
      }

      // Return Razorpay order details for embedded checkout
      const response = {
        success: true,
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: config.razorpay.keyId, // Public key for frontend
        },
        payment: payment || null,
      };

      const duration = Date.now() - startTime;
      console.log(`[PAYMENT] [${new Date().toISOString()}] ✅ Step 6: Razorpay order creation complete (Duration: ${duration}ms)`);
      console.log(`[PAYMENT] [${new Date().toISOString()}] Success response:`, JSON.stringify(response, null, 2));

      res.json(response);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[PAYMENT] [${new Date().toISOString()}] ❌ Error creating Razorpay order (Duration: ${duration}ms):`, error);
      console.error(`[PAYMENT] [${new Date().toISOString()}] Error stack:`, error.stack);
      next(error);
    }
  }
);

/**
 * POST /api/payments/verify
 * Verify payment and update order status
 */
interface VerifyPaymentRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

router.post(
  "/verify",
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 1: Initiate payment verification`);
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Request received:`, {
        orderId: req.body.orderId,
        razorpayOrderId: req.body.razorpayOrderId,
        razorpayPaymentId: req.body.razorpayPaymentId,
        razorpaySignature: req.body.razorpaySignature ? `${req.body.razorpaySignature.substring(0, 20)}...` : null,
      });

      const {
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      }: VerifyPaymentRequest = req.body;

      // Validate required fields
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 2: Validating request fields`);
      if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Validation failed: Missing required fields`);
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature",
        });
      }
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Validation passed`);

      // Verify payment signature
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 3: Verifying payment signature`);
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Signature params:`, {
        razorpayOrderId,
        razorpayPaymentId,
        signatureLength: razorpaySignature.length,
      });
      
      const isValidSignature = verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValidSignature) {
        console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Invalid payment signature`);
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature",
        });
      }
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Signature verification passed`);

      // Fetch payment details from Razorpay
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 4: Fetching payment details from Razorpay (Payment ID: ${razorpayPaymentId})`);
      const paymentDetails = await getPaymentDetails(razorpayPaymentId);
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Payment details fetched:`, {
        id: paymentDetails.id,
        entity: paymentDetails.entity,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        status: paymentDetails.status,
        method: paymentDetails.method,
        order_id: paymentDetails.order_id,
        created_at: paymentDetails.created_at,
      });

      // Get order details
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 5: Fetching order from database (Order ID: ${orderId})`);
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, total_amount, payment_status")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Order not found:`, orderError);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Order found:`, {
        order_number: order.order_number,
        total_amount: order.total_amount,
        current_payment_status: order.payment_status,
      });

      // Update payment record
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 6: Updating payment record in database`);
      const { data: existingPayment, error: paymentLookupError } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (paymentLookupError) {
        console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Error looking up payment record:`, paymentLookupError);
      } else {
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Payment record found:`, {
          payment_id: existingPayment?.id,
        });
      }

      const paymentStatus =
        paymentDetails.status === "captured" ? "captured" : "failed";
      const orderPaymentStatus = paymentStatus === "captured" ? "paid" : "failed";
      
      console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Payment status:`, {
        razorpay_status: paymentDetails.status,
        payment_status: paymentStatus,
        order_payment_status: orderPaymentStatus,
        payment_method: paymentDetails.method,
      });

      const paymentData: any = {
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: paymentStatus,
        payment_method: paymentDetails.method || null,
        updated_at: new Date().toISOString(),
      };

      if (existingPayment) {
        // Update existing payment
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 7: Updating existing payment record`);
        const { data: payment, error: updateError } = await supabaseAdmin
          .from("payments")
          .update(paymentData)
          .eq("id", existingPayment.id)
          .select()
          .single();

        if (updateError) {
          console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Failed to update payment record:`, updateError);
          throw new Error("Failed to update payment record");
        }
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Payment record updated:`, {
          id: payment.id,
          status: payment.status,
          payment_method: payment.payment_method,
        });

        // Update order payment status
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 8: Updating order payment status`);
        const { error: orderUpdateError } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: orderPaymentStatus,
            payment_id: payment.id,
          })
          .eq("id", orderId);

        if (orderUpdateError) {
          console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Failed to update order:`, orderUpdateError);
          throw new Error("Failed to update order payment status");
        }
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Order payment status updated to: ${orderPaymentStatus}`);

        const response = {
          success: true,
          message: "Payment verified successfully",
          payment: payment,
          order: {
            id: order.id,
            order_number: order.order_number,
            payment_status: paymentStatus === "captured" ? "paid" : "failed",
          },
        };

        const duration = Date.now() - startTime;
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Step 9: Payment verification complete (Duration: ${duration}ms)`);
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Success response:`, JSON.stringify(response, null, 2));

        return res.json(response);
      } else {
        // Create new payment record (shouldn't happen, but handle it)
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 7: Creating new payment record (unexpected)`);
        const { data: payment, error: createError } = await supabaseAdmin
          .from("payments")
          .insert({
            order_id: orderId,
            razorpay_order_id: razorpayOrderId,
            ...paymentData,
            amount: order.total_amount,
            currency: "INR",
            gateway: "Prepaid",
          })
          .select()
          .single();

        if (createError) {
          console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Failed to create payment record:`, createError);
          throw new Error("Failed to create payment record");
        }
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ New payment record created:`, {
          id: payment.id,
          status: payment.status,
        });

        // Update order payment status
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Step 8: Updating order payment status`);
        const { error: orderUpdateError } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: orderPaymentStatus,
            payment_id: payment.id,
          })
          .eq("id", orderId);

        if (orderUpdateError) {
          console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Failed to update order:`, orderUpdateError);
          throw new Error("Failed to update order payment status");
        }
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Order payment status updated to: ${orderPaymentStatus}`);

        const response = {
          success: true,
          message: "Payment verified successfully",
          payment: payment,
          order: {
            id: order.id,
            order_number: order.order_number,
            payment_status: paymentStatus === "captured" ? "paid" : "failed",
          },
        };

        const duration = Date.now() - startTime;
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] ✅ Step 9: Payment verification complete (Duration: ${duration}ms)`);
        console.log(`[PAYMENT VERIFY] [${new Date().toISOString()}] Success response:`, JSON.stringify(response, null, 2));

        return res.json(response);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] ❌ Error verifying payment (Duration: ${duration}ms):`, error);
      console.error(`[PAYMENT VERIFY] [${new Date().toISOString()}] Error stack:`, error.stack);
      next(error);
    }
  }
);

/**
 * Helper function to verify and update payment
 * Returns { success: boolean, orderId?: string, orderNumber?: string, paymentStatus?: string, error?: string }
 */
async function verifyAndUpdatePayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  paymentStatus?: string;
  error?: string;
}> {
  try {
    // Step 1: Verify payment signature
    console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Step 1: Verifying payment signature`);
    const isValidSignature = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Invalid payment signature`);
      return { success: false, error: 'invalid_signature' };
    }
    console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ✅ Signature verification passed`);

    // Step 2: Look up our internal order_id using razorpay_order_id from payments table
    console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Step 2: Looking up payment record using razorpay_order_id: ${razorpayOrderId}`);
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, status")
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (paymentError || !payment) {
      console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Payment record not found for razorpay_order_id: ${razorpayOrderId}`, paymentError);
      return { success: false, error: 'payment_not_found' };
    }

    const orderId = payment.order_id;
    console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ✅ Found payment record:`, {
      payment_id: payment.id,
      order_id: orderId,
      current_status: payment.status,
    });

    // Step 3: Check if payment is already verified (idempotency)
    if (payment.status === 'captured') {
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ℹ️ Payment already verified, skipping verification`);
    } else {
      // Step 4: Fetch payment details from Razorpay
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Step 3: Fetching payment details from Razorpay`);
      const paymentDetails = await getPaymentDetails(razorpayPaymentId);
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ✅ Payment details fetched:`, {
        id: paymentDetails.id,
        status: paymentDetails.status,
        method: paymentDetails.method,
      });

      // Step 5: Update payment record
      const paymentStatus = paymentDetails.status === "captured" ? "captured" : "failed";
      const orderPaymentStatus = paymentStatus === "captured" ? "paid" : "failed";

      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Step 4: Updating payment record`);
      const paymentData: any = {
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: paymentStatus,
        payment_method: paymentDetails.method || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update(paymentData)
        .eq("id", payment.id);

      if (updateError) {
        console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Failed to update payment record:`, updateError);
        return { success: false, error: 'update_failed' };
      }
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ✅ Payment record updated:`, {
        status: paymentStatus,
        payment_method: paymentDetails.method,
      });

      // Step 6: Update order payment status
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Step 5: Updating order payment status`);
      const { error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: orderPaymentStatus,
          payment_id: payment.id,
        })
        .eq("id", orderId);

      if (orderUpdateError) {
        console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Failed to update order:`, orderUpdateError);
        return { success: false, error: 'order_update_failed' };
      }
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ✅ Order payment status updated to: ${orderPaymentStatus}`);
    }

    // Step 7: Get order_number for redirect
    console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Step 6: Fetching order details`);
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("order_number, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Order not found for order_id: ${orderId}`, orderError);
      return { success: false, error: 'order_not_found' };
    }

    return {
      success: true,
      orderId,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
    };
  } catch (error: any) {
    console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Error in verifyAndUpdatePayment:`, error);
    return { success: false, error: 'verification_failed' };
  }
}

/**
 * POST /api/payments/callback
 * Handle Razorpay embedded checkout callback (POST from Razorpay)
 * This endpoint verifies payment, updates database, and redirects to frontend
 */
router.post(
  "/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Received POST callback from Razorpay`);
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Request body:`, req.body);

      // Razorpay only sends these three parameters after successful payment:
      // - razorpay_payment_id
      // - razorpay_order_id  
      // - razorpay_signature
      const razorpay_payment_id = req.body.razorpay_payment_id || req.body['razorpay_payment_id'];
      const razorpay_order_id = req.body.razorpay_order_id || req.body['razorpay_order_id'];
      const razorpay_signature = req.body.razorpay_signature || req.body['razorpay_signature'];

      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Extracted Razorpay params:`, {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature: razorpay_signature ? `${razorpay_signature.substring(0, 20)}...` : null,
      });

      // Validate required parameters
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Missing required Razorpay parameters`);
        const errorParams = new URLSearchParams();
        errorParams.append('status', 'error');
        errorParams.append('error', 'missing_payment_details');
        res.redirect(`${config.frontendUrl}/payment-callback?${errorParams.toString()}`);
        return;
      }

      // Verify payment and update database
      const result = await verifyAndUpdatePayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      // Build redirect URL based on verification result
      const params = new URLSearchParams();
      
      if (result.success && result.orderId && result.orderNumber) {
        // Success: redirect with success status
        params.append('status', 'success');
        params.append('order_id', result.orderId);
        params.append('order_number', result.orderNumber);
        params.append('payment_status', result.paymentStatus || 'paid');
        console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ✅ Payment verified and updated, redirecting to success page`);
      } else {
        // Failure: redirect with error status
        params.append('status', 'error');
        params.append('error', result.error || 'verification_failed');
        if (result.orderId) params.append('order_id', result.orderId);
        if (result.orderNumber) params.append('order_number', result.orderNumber);
        console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Payment verification failed: ${result.error}`);
      }

      const redirectUrl = `${config.frontendUrl}/payment-callback?${params.toString()}`;
      console.log(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Redirecting to: ${redirectUrl}`);
      
      // Redirect to frontend
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] ❌ Error handling callback:`, error);
      console.error(`[PAYMENT CALLBACK] [${new Date().toISOString()}] Error stack:`, error.stack);
      // Even on error, redirect to frontend with error info
      const errorParams = new URLSearchParams();
      errorParams.append('status', 'error');
      errorParams.append('error', 'callback_processing_failed');
      res.redirect(`${config.frontendUrl}/payment-callback?${errorParams.toString()}`);
    }
  }
);

/**
 * POST /api/payments/webhook
 * Handle Razorpay webhook events (for payment status updates)
 */
router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      const payload = JSON.stringify(req.body);

      // Verify webhook signature
      if (!verifyWebhookSignature(payload, signature)) {
        return res.status(400).json({
          success: false,
          message: "Invalid webhook signature",
        });
      }

      const event = req.body.event;
      const payment = req.body.payload?.payment?.entity;

      console.log(`📥 Razorpay webhook received: ${event}`);

      // Handle payment.captured event
      if (event === "payment.captured" && payment) {
        const razorpayPaymentId = payment.id;
        const razorpayOrderId = payment.order_id;

        // Find payment record
        const { data: paymentRecord } = await supabaseAdmin
          .from("payments")
          .select("id, order_id")
          .eq("razorpay_payment_id", razorpayPaymentId)
          .single();

        if (paymentRecord) {
          // Update payment status
          await supabaseAdmin
            .from("payments")
            .update({
              status: "captured",
              payment_method: payment.method || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          // Update order payment status
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "paid",
              payment_id: paymentRecord.id,
            })
            .eq("id", paymentRecord.order_id);

          console.log(`✅ Payment captured and order updated: ${paymentRecord.order_id}`);
        }
      }

      // Handle payment.failed event
      if (event === "payment.failed" && payment) {
        const razorpayPaymentId = payment.id;

        // Find payment record
        const { data: paymentRecord } = await supabaseAdmin
          .from("payments")
          .select("id, order_id")
          .eq("razorpay_payment_id", razorpayPaymentId)
          .single();

        if (paymentRecord) {
          // Update payment status
          await supabaseAdmin
            .from("payments")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          // Update order payment status
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "failed",
            })
            .eq("id", paymentRecord.order_id);

          console.log(`❌ Payment failed and order updated: ${paymentRecord.order_id}`);
        }
      }

      // Always return 200 to acknowledge webhook receipt
      res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      // Still return 200 to prevent Razorpay from retrying
      res.status(200).json({ success: false, message: "Webhook processed with errors" });
    }
  }
);

/**
 * POST /api/payments/refund
 * Process a refund for a payment (admin only - can be added later)
 */
interface RefundRequest {
  paymentId: string; // Razorpay payment ID
  amount?: number; // Optional: amount to refund (if not provided, full refund)
  notes?: { [key: string]: string };
}

router.post(
  "/refund",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, amount, notes }: RefundRequest = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: "Payment ID is required",
        });
      }

      // Find payment record
      const { data: paymentRecord } = await supabaseAdmin
        .from("payments")
        .select("id, order_id, razorpay_payment_id, amount, status")
        .eq("razorpay_payment_id", paymentId)
        .single();

      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (paymentRecord.status !== "captured") {
        return res.status(400).json({
          success: false,
          message: "Only captured payments can be refunded",
        });
      }

      // Process refund through Razorpay
      const refund = await processRefund(
        paymentRecord.razorpay_payment_id,
        amount,
        notes
      );

      // Update payment status
      await supabaseAdmin
        .from("payments")
        .update({
          status: amount && amount < paymentRecord.amount ? "partially_refunded" : "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentRecord.id);

      // Update order payment status
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "refunded",
        })
        .eq("id", paymentRecord.order_id);

      res.json({
        success: true,
        message: "Refund processed successfully",
        refund: refund,
      });
    } catch (error: any) {
      console.error("Error processing refund:", error);
      next(error);
    }
  }
);

export default router;

