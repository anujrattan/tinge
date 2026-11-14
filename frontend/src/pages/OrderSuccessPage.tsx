import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Player } from "@lottiefiles/react-lottie-player";
import { Button } from "../components/ui";
import { useApp } from "../context/AppContext";
import api from "../services/api";
import {
  trackPurchase,
  PURCHASE_PAYLOAD_STORAGE_KEY,
  TrackingItem,
} from "../utils/gtm";

const VERIFY_MIN_MS = 900;
const PAYMENT_ANIMATION_DURATION_MS = 2500;
const GUEST_CHECKOUT_STORAGE_KEY = "guestCheckoutAddress";

type Phase = "verifying" | "payment" | "order";

function getGuestEmailFromStorage(): string | null {
  try {
    const raw = localStorage.getItem(GUEST_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data?.email === "string" ? data.email.trim() || null : null;
  } catch {
    return null;
  }
}

function getCallbackErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case "missing_payment_details":
      return "Payment details are missing. Please contact support with your order number.";
    case "invalid_signature":
      return "Payment verification failed due to an invalid signature. Please contact support.";
    case "payment_not_found":
      return "We couldn't find a payment record for this order. Please contact support.";
    case "callback_processing_failed":
    case "verification_failed":
    case "update_failed":
    case "order_update_failed":
    case "order_not_found":
      return "Something went wrong while confirming your payment. Please contact support with your order number.";
    default:
      return "We couldn't confirm your payment. Please contact support with your order number.";
  }
}

export const OrderSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { clearCart } = useApp();

  // Support both /order-success?orderNumber=… and /payment-callback?order_number=…
  const orderNumber = params.get("orderNumber") || params.get("order_number");
  const paymentStatus =
    params.get("paymentStatus") || params.get("payment_status");
  const statusParam = params.get("status"); // set by Razorpay backend callback
  const errorCode = params.get("error");
  const gateway =
    params.get("gateway") ||
    (paymentStatus || statusParam === "success" || statusParam === "error"
      ? "Prepaid"
      : null);

  const isPaymentReturn =
    location.pathname === "/payment-callback" ||
    statusParam === "success" ||
    statusParam === "error";

  const isCallbackError = statusParam === "error";
  const isFailed =
    isCallbackError || paymentStatus === "failed";
  const isPrepaidPaid =
    !isFailed &&
    gateway === "Prepaid" &&
    (paymentStatus === "paid" ||
      (statusParam === "success" && paymentStatus !== "failed"));
  const isPurchaseSuccess =
    (gateway === "COD" && !isFailed) || isPrepaidPaid;

  const [phase, setPhase] = useState<Phase>(() => {
    if (isFailed) return "order";
    if (isPrepaidPaid && isPaymentReturn) return "verifying";
    if (isPrepaidPaid) return "payment";
    return "order";
  });
  const [verifyError, setVerifyError] = useState<string | null>(
    isCallbackError ? getCallbackErrorMessage(errorCode) : null
  );

  // Clear cart once payment is confirmed
  useEffect(() => {
    if (isPrepaidPaid && (phase === "payment" || phase === "order")) {
      clearCart();
    }
  }, [isPrepaidPaid, phase, clearCart]);

  // Confirm payment on return from Razorpay (backend already verified; we re-check when possible)
  useEffect(() => {
    if (phase !== "verifying" || !isPrepaidPaid) return;

    let cancelled = false;
    const startedAt = Date.now();

    const finishOk = async () => {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, VERIFY_MIN_MS - elapsed);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (!cancelled) setPhase("payment");
    };

    const confirm = async () => {
      // Query params already say paid — try a live order check for extra confidence
      if (paymentStatus === "paid" || statusParam === "success") {
        try {
          const email = getGuestEmailFromStorage();
          if (orderNumber && email) {
            const response = await api.getOrderByNumber(orderNumber, email);
            if (cancelled) return;
            const liveStatus =
              response?.order?.payment_status || response?.payment_status;
            if (liveStatus === "failed") {
              setVerifyError(
                "Payment verification failed. Please contact support with your order number."
              );
              return;
            }
            if (liveStatus === "paid" || liveStatus === "captured") {
              await finishOk();
              return;
            }
          }
        } catch {
          // Fall through — trust backend redirect if lookup isn't available yet
        }
        await finishOk();
        return;
      }

      setVerifyError(getCallbackErrorMessage(errorCode));
    };

    confirm();
    return () => {
      cancelled = true;
    };
  }, [
    phase,
    isPrepaidPaid,
    paymentStatus,
    statusParam,
    orderNumber,
    errorCode,
  ]);

  // Payment checkmark → order celebration
  useEffect(() => {
    if (phase !== "payment") return;
    const t = setTimeout(() => setPhase("order"), PAYMENT_ANIMATION_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // GTM purchase
  const purchaseTrackedRef = useRef(false);
  useEffect(() => {
    if (!isPurchaseSuccess || !orderNumber || purchaseTrackedRef.current) return;
    if (phase !== "order" && isPrepaidPaid) return;
    try {
      const raw = sessionStorage.getItem(PURCHASE_PAYLOAD_STORAGE_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        orderNumber?: string;
        value?: number;
        currency?: string;
        items?: TrackingItem[];
      };
      if (payload.orderNumber && payload.orderNumber !== orderNumber) return;
      trackPurchase({
        order_id: orderNumber,
        transaction_id: payload.orderNumber ?? orderNumber,
        currency: payload.currency,
        value: payload.value,
        items: payload.items,
      });
      purchaseTrackedRef.current = true;
      sessionStorage.removeItem(PURCHASE_PAYLOAD_STORAGE_KEY);
    } catch (_) {}
  }, [isPurchaseSuccess, orderNumber, phase, isPrepaidPaid]);

  const goToOrderDetails = () => {
    if (!orderNumber) return;
    const email = getGuestEmailFromStorage();
    const url = email
      ? `/order-details/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`
      : `/order-details/${encodeURIComponent(orderNumber)}`;
    navigate(url);
  };

  const getStatusMessage = () => {
    if (gateway === "COD") {
      return {
        title: "Order Placed Successfully!",
        message:
          "Your order has been confirmed. You will pay when you receive the order.",
      };
    }
    if (paymentStatus === "paid" || (statusParam === "success" && !isFailed)) {
      return {
        title: "Order Placed Successfully!",
        message: "Your order has been confirmed and payment has been received.",
      };
    }
    if (isFailed) {
      return {
        title: paymentStatus === "failed" ? "Payment Failed" : "Payment Issue",
        message:
          verifyError ||
          getCallbackErrorMessage(errorCode) ||
          "Your order was created, but we couldn't confirm the payment. Please contact support with your order number.",
      };
    }
    return {
      title: "Order Placed!",
      message:
        "Your order has been created. Payment status will be updated shortly.",
    };
  };

  const status = getStatusMessage();

  // ── Failed / error ─────────────────────────────────────────────────────────
  if (isFailed || verifyError) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
        <div className="max-w-2xl mx-auto bg-brand-surface p-8 rounded-lg shadow-sm border border-white/10">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 bg-red-500/20">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-display text-brand-primary">
            {status.title}
          </h1>
          {orderNumber && (
            <p className="mt-4 text-lg text-brand-secondary">
              Order Number:{" "}
              <span className="font-semibold text-brand-primary">
                {orderNumber}
              </span>
            </p>
          )}
          <p className="mt-4 text-brand-secondary">
            {verifyError || status.message}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/checkout")} className="px-6">
              Try Again
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="px-6"
            >
              Back to Home
            </Button>
            {orderNumber && (
              <Button
                onClick={goToOrderDetails}
                variant="outline"
                className="px-6"
              >
                View Order Details
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Verifying (just back from Razorpay) ────────────────────────────────────
  if (phase === "verifying") {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn min-h-[60vh] flex flex-col items-center justify-center">
        <div className="max-w-sm mx-auto">
          <div
            className="mx-auto mb-6 h-14 w-14 rounded-full border-2 border-[#FF7A59]/25 border-t-[#FF7A59] animate-spin"
            aria-hidden
          />
          <h1 className="font-playfair text-2xl md:text-3xl font-medium text-brand-primary">
            Confirming your payment
          </h1>
          <p className="mt-3 text-brand-secondary">
            Hang tight — we&apos;re verifying your payment with Razorpay.
          </p>
          {orderNumber && (
            <p className="mt-4 text-sm text-brand-secondary/70">
              Order {orderNumber}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Payment success animation ──────────────────────────────────────────────
  if (isPrepaidPaid && phase === "payment") {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn min-h-[60vh] flex flex-col items-center justify-center">
        <div className="max-w-xs mx-auto">
          <Player
            src="/Check Mark.json"
            autoplay
            loop={false}
            style={{ width: 200, height: 200 }}
            aria-label="Payment successful"
          />
          <p className="text-xl font-semibold text-brand-primary mt-4">
            Payment Successful
          </p>
          <p className="mt-2 text-sm text-brand-secondary">
            Preparing your order confirmation…
          </p>
        </div>
      </div>
    );
  }

  // ── Order confirmed ────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
      <div className="max-w-2xl mx-auto bg-brand-surface p-8 rounded-lg shadow-sm border border-white/10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-56 flex items-start justify-center">
          <Player
            src="/Confetti.json"
            autoplay
            loop={false}
            speed={0.6}
            style={{ width: "100%", height: "100%", transform: "scaleY(-1)" }}
            aria-label="Celebration confetti"
          />
        </div>
        <img
          src={encodeURI("/Order Success.png")}
          alt="Order successful"
          className="relative z-10 mx-auto w-full max-w-sm h-auto object-contain"
        />
        <h1 className="text-3xl font-bold font-display text-brand-primary mt-6">
          {status.title}
        </h1>
        {orderNumber && (
          <p className="mt-4 text-lg text-brand-secondary">
            Order Number:{" "}
            <span className="font-semibold text-brand-primary">
              {orderNumber}
            </span>
          </p>
        )}
        <p className="mt-4 text-brand-secondary">{status.message}</p>
        {(gateway === "Prepaid" || gateway === "COD") && (
          <p className="mt-4 text-sm text-brand-secondary">
            You&apos;ll receive a confirmation email shortly.
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate("/")} className="px-6">
            Back to Home
          </Button>
          {orderNumber && (
            <Button onClick={goToOrderDetails} variant="outline" className="px-6">
              View Order Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
