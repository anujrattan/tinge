/**
 * Shared refund execution for Razorpay payments.
 */

import { supabaseAdmin } from "./supabase.js";
import { processRefund } from "./razorpay.js";

export interface ExecuteRefundResult {
  refund: any;
  paymentStatus: "refunded" | "partially_refunded";
  orderPaymentStatus: "refunded" | "partially_refunded";
}

export async function executePaymentRefund(options: {
  razorpayPaymentId: string;
  amount?: number;
  notes?: Record<string, string>;
}): Promise<ExecuteRefundResult> {
  const { data: paymentRecord } = await supabaseAdmin
    .from("payments")
    .select("id, order_id, razorpay_payment_id, amount, status")
    .eq("razorpay_payment_id", options.razorpayPaymentId)
    .single();

  if (!paymentRecord) {
    throw new Error("Payment not found");
  }

  const refundableStatuses = ["captured", "partially_refunded"];
  if (!refundableStatuses.includes(paymentRecord.status)) {
    throw new Error("Only captured payments can be refunded");
  }

  const refundAmount = options.amount ?? Number(paymentRecord.amount);
  const isPartial = refundAmount < Number(paymentRecord.amount);

  const refund = await processRefund(
    paymentRecord.razorpay_payment_id,
    options.amount,
    options.notes
  );

  const paymentStatus = isPartial ? "partially_refunded" : "refunded";

  await supabaseAdmin
    .from("payments")
    .update({
      status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentRecord.id);

  await supabaseAdmin
    .from("orders")
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentRecord.order_id);

  return {
    refund,
    paymentStatus,
    orderPaymentStatus: paymentStatus,
  };
}
