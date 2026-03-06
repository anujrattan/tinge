/**
 * Razorpay Payment Gateway Service
 *
 * Handles Razorpay integration for payment processing
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config/index.js";

// Initialize Razorpay client
let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      const errorMsg =
        "Razorpay keys not configured. Please set one of the following:\n" +
        "  - RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (production)\n" +
        "  - RAZORPAY_TEST_API_KEY_ID and RAZORPAY_TEST_API_KEY_SECRET (test)\n" +
        "  - RAZORPAY_TEST_API_KEY and RAZORPAY_TEST_API_KEY_SECRET (test alternative)\n" +
        `Current values: keyId=${
          config.razorpay.keyId ? "SET" : "NOT SET"
        }, keySecret=${config.razorpay.keySecret ? "SET" : "NOT SET"}`;
      console.error(
        `[RAZORPAY SERVICE] [${new Date().toISOString()}] ❌ ${errorMsg}`
      );
      throw new Error(errorMsg);
    }

    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] ✅ Razorpay client initialized (Key ID: ${config.razorpay.keyId.substring(
        0,
        8
      )}...)`
    );

    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  return razorpayInstance;
}

/**
 * Create a Razorpay order
 *
 * @param amount - Amount in INR (will be converted to paise)
 * @param orderNumber - Our order number (for receipt)
 * @param orderId - Our order ID (for notes/reference)
 * @returns Razorpay order object
 */
export async function createRazorpayOrder(
  amount: number,
  orderNumber: string,
  orderId: string
): Promise<any> {
  try {
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Creating Razorpay order via API`
    );
    const razorpay = getRazorpayInstance();

    // Amount in paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Order creation params:`,
      {
        amountInPaise,
        amountInRupees: amount,
        currency: "INR",
        receipt: orderNumber,
      }
    );

    const orderOptions = {
      amount: amountInPaise, // Amount in paise
      currency: "INR",
      receipt: orderNumber, // Use our order number as receipt
      notes: {
        order_id: orderId, // Store our order ID for reference
        order_number: orderNumber,
      },
      // Payment capture method: automatic (captures payment immediately)
      payment_capture: 1,
    };

    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Calling Razorpay API: orders.create()`
    );
    const order = await razorpay.orders.create(orderOptions);
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] ✅ Razorpay order created successfully:`,
      {
        id: order.id,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
      }
    );

    return order;
  } catch (error: any) {
    console.error(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] ❌ Error creating Razorpay order:`,
      error
    );
    console.error(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Error details:`,
      {
        message: error.message,
        description: error.description,
        field: error.field,
        source: error.source,
        step: error.step,
        reason: error.reason,
        metadata: error.metadata,
      }
    );
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 *
 * @param razorpayOrderId - Order ID from Razorpay
 * @param razorpayPaymentId - Payment ID from Razorpay
 * @param razorpaySignature - Signature from Razorpay
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Verifying payment signature`
    );
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Signature params:`,
      {
        razorpayOrderId,
        razorpayPaymentId,
        signatureLength: razorpaySignature.length,
      }
    );

    const razorpay = getRazorpayInstance();

    // Generate signature using the same method Razorpay uses
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Signature text: ${text}`
    );

    const generatedSignature = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(text)
      .digest("hex");

    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Generated signature: ${generatedSignature.substring(
        0,
        20
      )}...`
    );
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Received signature: ${razorpaySignature.substring(
        0,
        20
      )}...`
    );

    // Compare signatures (use secure comparison to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(razorpaySignature)
    );

    if (isValid) {
      console.log(
        `[RAZORPAY SERVICE] [${new Date().toISOString()}] ✅ Signature verification passed`
      );
    } else {
      console.error(
        `[RAZORPAY SERVICE] [${new Date().toISOString()}] ❌ Signature verification failed`
      );
    }

    return isValid;
  } catch (error: any) {
    console.error(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] ❌ Error verifying payment signature:`,
      error
    );
    console.error(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Error stack:`,
      error.stack
    );
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 *
 * @param payload - Raw webhook payload (as string)
 * @param signature - Webhook signature from Razorpay
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  try {
    if (!config.razorpay.webhookSecret) {
      console.warn(
        "Webhook secret not configured, skipping signature verification"
      );
      return true; // Allow if webhook secret is not set (for development)
    }

    const generatedSignature = crypto
      .createHmac("sha256", config.razorpay.webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );
  } catch (error: any) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 *
 * @param paymentId - Razorpay payment ID
 * @returns Payment details
 */
export async function getPaymentDetails(paymentId: string): Promise<any> {
  try {
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Fetching payment details from Razorpay`
    );
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Payment ID: ${paymentId}`
    );

    const razorpay = getRazorpayInstance();
    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Calling Razorpay API: payments.fetch(${paymentId})`
    );

    const payment = await razorpay.payments.fetch(paymentId);

    console.log(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] ✅ Payment details fetched:`,
      {
        id: payment.id,
        entity: payment.entity,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        order_id: payment.order_id,
        created_at: payment.created_at,
      }
    );

    return payment;
  } catch (error: any) {
    console.error(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] ❌ Error fetching payment details:`,
      error
    );
    console.error(
      `[RAZORPAY SERVICE] [${new Date().toISOString()}] Error details:`,
      {
        message: error.message,
        description: error.description,
        code: error.code,
      }
    );
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
}

/**
 * Process refund for a payment
 *
 * @param paymentId - Razorpay payment ID
 * @param amount - Amount to refund (in INR). If not provided, full refund
 * @param notes - Optional notes for the refund
 * @returns Refund details
 */
export async function processRefund(
  paymentId: string,
  amount?: number,
  notes?: { [key: string]: string }
): Promise<any> {
  try {
    const razorpay = getRazorpayInstance();

    const refundOptions: any = {
      notes: notes || {},
    };

    // If amount specified, convert to paise; otherwise full refund
    if (amount) {
      refundOptions.amount = Math.round(amount * 100);
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    return refund;
  } catch (error: any) {
    console.error("Error processing refund:", error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
}
