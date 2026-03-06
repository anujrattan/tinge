import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Player } from "@lottiefiles/react-lottie-player";
import { Button } from "../components/ui";
import { useApp } from "../context/AppContext";
import { trackPurchase, PURCHASE_PAYLOAD_STORAGE_KEY, TrackingItem } from "../utils/gtm";

const PAYMENT_ANIMATION_DURATION_MS = 2500;
const GUEST_CHECKOUT_STORAGE_KEY = 'guestCheckoutAddress';

function getGuestEmailFromStorage(): string | null {
  try {
    const raw = localStorage.getItem(GUEST_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data?.email === 'string' ? data.email.trim() || null : null;
  } catch {
    return null;
  }
}

export const OrderSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderNumber = params.get("orderNumber") || params.get("order_number");
  const paymentStatus = params.get("paymentStatus") || params.get("payment_status");
  const gateway = params.get("gateway") || (paymentStatus ? "Prepaid" : null);
  const { clearCart } = useApp();

  const isPrepaidPaid = gateway === "Prepaid" && paymentStatus === "paid";
  const isFailed = paymentStatus === "failed";
  const isPurchaseSuccess = (gateway === "COD" && !isFailed) || (gateway === "Prepaid" && paymentStatus === "paid");

  // Clear cart on successful prepaid payment (COD is already cleared at checkout)
  useEffect(() => {
    if (isPrepaidPaid) {
      clearCart();
    }
  }, [isPrepaidPaid, clearCart]);

  const purchaseTrackedRef = useRef(false);
  useEffect(() => {
    if (!isPurchaseSuccess || !orderNumber || purchaseTrackedRef.current) return;
    try {
      const raw = sessionStorage.getItem(PURCHASE_PAYLOAD_STORAGE_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw) as { orderNumber?: string; value?: number; currency?: string; items?: TrackingItem[] };
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
  }, [isPurchaseSuccess, orderNumber]);

  const [phase, setPhase] = useState<"payment" | "order">(
    isPrepaidPaid ? "payment" : "order"
  );

  useEffect(() => {
    if (!isPrepaidPaid || phase !== "payment") return;
    const t = setTimeout(() => setPhase("order"), PAYMENT_ANIMATION_DURATION_MS);
    return () => clearTimeout(t);
  }, [isPrepaidPaid, phase]);

  const getStatusMessage = () => {
    if (gateway === "COD") {
      return {
        title: "Order Placed Successfully!",
        message:
          "Your order has been confirmed. You will pay when you receive the order.",
      };
    }
    if (paymentStatus === "paid") {
      return {
        title: "Order Placed Successfully!",
        message: "Your order has been confirmed and payment has been received.",
      };
    }
    if (paymentStatus === "failed") {
      return {
        title: "Payment Failed",
        message:
          "Your order has been created, but payment failed. Please contact support with your order number.",
      };
    }
    return {
      title: "Order Placed!",
      message:
        "Your order has been created. Payment status will be updated shortly.",
    };
  };

  const status = getStatusMessage();

  if (isFailed) {
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
          <p className="mt-4 text-brand-secondary">{status.message}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/")} className="px-6">
              Back to Home
            </Button>
            {orderNumber && (
              <Button
                onClick={() => {
                  const email = getGuestEmailFromStorage();
                  const url = email
                    ? `/order-details/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`
                    : `/order-details/${encodeURIComponent(orderNumber)}`;
                  navigate(url);
                }}
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
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
      <div className="max-w-2xl mx-auto bg-brand-surface p-8 rounded-lg shadow-sm border border-white/10 relative overflow-hidden">
        {/* Confetti falling from top, overlapping illustration */}
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
        {gateway === "Prepaid" && paymentStatus === "paid" && (
          <p className="mt-4 text-sm text-brand-secondary">
            You'll receive a confirmation email shortly.
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate("/")} className="px-6">
            Back to Home
          </Button>
          {orderNumber && (
            <Button
              onClick={() => {
                const email = getGuestEmailFromStorage();
                const url = email
                  ? `/order-details/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`
                  : `/order-details/${encodeURIComponent(orderNumber)}`;
                navigate(url);
              }}
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
};
