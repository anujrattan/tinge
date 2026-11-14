import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { RateProductModal } from '../components/RateProductModal';
import { ReturnRequestModal } from '../components/ReturnRequestModal';
import { StarRating } from '../components/StarRating';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

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

export const OrderDetailsPage: React.FC = () => {
  const { orderNumber: orderNumberParam } = useParams<{ orderNumber: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useApp();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [lookupOrderNumber, setLookupOrderNumber] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; imageUrl?: string } | null>(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [orderReturns, setOrderReturns] = useState<any[]>([]);
  const [canRequestReturn, setCanRequestReturn] = useState(false);
  const cancellationHandledRef = useRef(false);

  const resolveEmail = useCallback(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery?.trim()) return fromQuery.trim();
    if (isAuthenticated) return user?.email?.trim() || null;
    return getGuestEmailFromStorage();
  }, [searchParams, isAuthenticated, user?.email]);

  const fetchOrderDetails = useCallback(async (
    orderNumber: string,
    email?: string | null,
    options?: { silent?: boolean },
  ) => {
    const silent = Boolean(options?.silent);
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
        setShowLookupForm(false);
      }

      let response;
      if (isAuthenticated) {
        try {
          response = await api.getOrderByNumber(orderNumber);
        } catch (authErr: any) {
          // Fallback: if auth-user mapping fails, try guest-style lookup by email.
          if (email && /403|Access denied/i.test(authErr?.message || '')) {
            response = await api.getOrderByNumber(orderNumber, email);
          } else {
            throw authErr;
          }
        }
      } else if (email) {
        response = await api.getOrderByNumber(orderNumber, email);
      } else {
        if (!silent) setLoading(false);
        setShowLookupForm(true);
        setLookupOrderNumber(orderNumber || '');
        setLookupEmail(getGuestEmailFromStorage() || '');
        return;
      }

      if (response.success && response.order) {
        setOrder(response.order);
        if (email && !searchParams.get('email')) {
          setSearchParams({ email }, { replace: true });
        }

        const productIds = [...new Set(response.order.items.map((item: any) => item.product_id).filter(Boolean))];
        const productPromises = productIds.map((id: string) => api.getProductById(id));
        const productResults = await Promise.all(productPromises);
        const productsMap: Record<string, any> = {};
        productResults.forEach((product) => {
          if (product) productsMap[product.id] = product;
        });
        setProducts(productsMap);

        try {
          const ratingsResponse = await api.getOrderRatings(orderNumber, email || undefined);
          if (ratingsResponse.success) {
            const ratingsMap: Record<string, number> = {};
            ratingsResponse.ratings.forEach((r: any) => {
              ratingsMap[r.product_id] = r.rating;
            });
            setUserRatings(ratingsMap);
          }
        } catch (err) {
          console.error('Failed to load ratings:', err);
        }

        if (response.order.status === 'delivered') {
          try {
            const [returnsRes, eligibilityRes] = await Promise.all([
              api.getOrderReturns(orderNumber, email || undefined),
              api.getReturnEligibility(orderNumber, email || undefined),
            ]);
            setOrderReturns(returnsRes.returns || []);
            const hasEligible = (eligibilityRes.items || []).some((i: any) => i.eligible);
            setCanRequestReturn(hasEligible);
          } catch (err) {
            console.error('Failed to load returns:', err);
            setOrderReturns([]);
            setCanRequestReturn(false);
          }
        } else {
          setOrderReturns([]);
          setCanRequestReturn(false);
        }
      } else if (!silent) {
        setError('We couldn’t find an order with that number and email. Please check and try again.');
        setShowLookupForm(true);
        setLookupOrderNumber(orderNumber);
        setLookupEmail(email || '');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'We couldn’t load this order. Please check your details and try again.');
        setShowLookupForm(true);
        setLookupOrderNumber(orderNumber);
        setLookupEmail(resolveEmail() || '');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated, resolveEmail, searchParams, setSearchParams]);

  useEffect(() => {
    const orderNumber = orderNumberParam?.trim();
    if (!orderNumber) {
      setLoading(false);
      setShowLookupForm(true);
      setLookupOrderNumber('');
      setLookupEmail(getGuestEmailFromStorage() || '');
      setError(null);
      return;
    }

    const email = resolveEmail();
    if (!isAuthenticated && !email) {
      setLoading(false);
      setShowLookupForm(true);
      setLookupOrderNumber(orderNumber);
      setLookupEmail('');
      setError(null);
      return;
    }

    fetchOrderDetails(orderNumber, email || undefined);
  }, [orderNumberParam, isAuthenticated, resolveEmail, fetchOrderDetails]);

  // Refresh order (shipping/tracking) when the user returns to the tab — avoids stale admin updates.
  useEffect(() => {
    const orderNumber = orderNumberParam?.trim();
    if (!orderNumber || showLookupForm) return;

    const email = resolveEmail();
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isAuthenticated && !email) return;
      void fetchOrderDetails(orderNumber, email || undefined, { silent: true });
    };

    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [orderNumberParam, isAuthenticated, resolveEmail, fetchOrderDetails, showLookupForm]);

  useEffect(() => {
    const cancelled = searchParams.get('cancelled') === 'true';
    if (!cancelled || cancellationHandledRef.current) return;
    cancellationHandledRef.current = true;
    showToast('Payment was cancelled. You can retry payment below.', 'error');

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('cancelled');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, showToast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    const email = !isAuthenticated ? searchParams.get('email') || undefined : undefined;
    try {
      await api.downloadInvoice(order.order_number, email);
    } catch (err: any) {
      alert(err.message || 'Failed to download invoice. Please try again.');
    }
  };

  const handleRetryPayment = async () => {
    if (!order?.id || !order?.order_number) return;
    try {
      setIsRetryingPayment(true);
      const amount = Number(order.total_amount || 0);
      const razorpayResponse = await api.createRazorpayOrder(order.id, order.order_number, amount);
      if (!razorpayResponse.success || !razorpayResponse.razorpay) {
        throw new Error('Failed to create Razorpay order');
      }

      const { orderId: razorpayOrderId, keyId, amount: amountInPaise } = razorpayResponse.razorpay;
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const callbackUrl = `${apiBase}/payments/callback`;
      const email = !isAuthenticated ? (searchParams.get('email') || '') : '';
      const cancelSuffix = email
        ? `?email=${encodeURIComponent(email)}&cancelled=true`
        : '?cancelled=true';
      const cancelUrl = `${window.location.origin}/order-details/${encodeURIComponent(order.order_number)}${cancelSuffix}`;

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://api.razorpay.com/v1/checkout/embedded';
      form.style.display = 'none';

      const fields = {
        key_id: keyId,
        amount: amountInPaise.toString(),
        order_id: razorpayOrderId,
        name: 'Tinge',
        description: `Order #${order.order_number}`,
        callback_url: callbackUrl,
        cancel_url: cancelUrl,
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      console.error('Retry payment failed:', err);
      showToast(err.message || 'Unable to retry payment right now. Please try again.', 'error');
      setIsRetryingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20';
      case 'shipped':
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20';
      case 'confirmed':
      case 'processing':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20';
      default:
        return 'text-brand-secondary bg-white/5 dark:bg-white/5 border border-white/20';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20';
      case 'refunded':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20';
      default:
        return 'text-brand-secondary bg-white/5 dark:bg-white/5 border border-white/20';
    }
  };

  // ─── Order status progression ─────────────────────────────────────────────
  const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;
  type OrderStatus = typeof STATUS_STEPS[number];
  const currentStepIndex = STATUS_STEPS.indexOf(order?.status as OrderStatus);

  const STEP_ICONS: Record<string, React.ReactNode> = {
    pending: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    confirmed: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    processing: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    shipped: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    delivered: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-14 max-w-5xl space-y-6" aria-busy="true">
        <div className="h-10 w-56 rounded-lg bg-wall motion-safe:animate-pulse" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-5">
            <div className="h-44 rounded-2xl bg-wall motion-safe:animate-pulse" />
            <div className="h-64 rounded-2xl bg-wall motion-safe:animate-pulse" />
          </div>
          <div className="lg:col-span-4 h-72 rounded-2xl bg-wall motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = lookupOrderNumber.trim();
    const em = lookupEmail.trim();
    if (!num || !em) return;
    navigate(`/order-details/${encodeURIComponent(num)}?email=${encodeURIComponent(em)}`, { replace: true });
  };

  if (showLookupForm && !order) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-coral text-center">Order Tracking</p>
          <h1 className="mt-2 font-playfair text-3xl font-medium text-brand-primary text-center">
            Find your order
          </h1>
          <p className="text-brand-secondary text-sm text-center mt-2 mb-7">
            Enter your order number and the email used at checkout.
          </p>
          {error && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 px-4">
              <p className="text-amber-700 dark:text-amber-400 text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={handleLookupSubmit} className="space-y-4">
            <div>
              <label htmlFor="lookup-order-number" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary mb-2">
                Order Number
              </label>
              <Input
                id="lookup-order-number"
                type="text"
                value={lookupOrderNumber}
                onChange={(e) => setLookupOrderNumber(e.target.value)}
                placeholder="e.g. TC-261113-0001"
                required
              />
            </div>
            <div>
              <label htmlFor="lookup-email" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary mb-2">
                Email Address
              </label>
              <Input
                id="lookup-email"
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[50px] w-full cursor-pointer items-center justify-center rounded-full bg-brand-ink text-sm font-medium text-brand-cream hover:bg-black disabled:opacity-50 dark:bg-brand-cream dark:text-brand-ink"
            >
              {loading ? 'Searching…' : 'View Order'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full mt-4 text-sm text-brand-secondary hover:text-brand-primary transition-colors text-center py-2"
          >
            ← Back to gallery
          </button>
        </div>
      </div>
    );
  }

  if (error && !order && !showLookupForm) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-20 text-center">
        <div>
          <p className="text-brand-secondary mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go home</Button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const originalTotal =
    (order.subtotal || 0) +
    (order.tax_amount || 0) +
    (order.shipping_cost || 0) +
    (order.cod_fee || 0);

  const discountAmount =
    typeof order.discount_amount === 'number'
      ? order.discount_amount
      : Math.max(0, originalTotal - (order.total_amount || 0));

  const isCancelled = order.status === 'cancelled';
  const needsRetryPayment = order.gateway === 'Prepaid' && order.payment_status !== 'paid';

  const trimStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const courierName = trimStr(order.shipping_partner);
  const trackingNo = trimStr(order.tracking_number);
  const trackingLink = trimStr(order.tracking_url);

  const showShippingDetailsSection =
    !isCancelled &&
    order.status !== 'failed' &&
    (order.payment_status === 'paid' || order.gateway === 'COD');

  const PLACEHOLDER_COURIER = 'Awaiting details';
  const PLACEHOLDER_TRACKING_ID = 'Awaiting details';
  const PLACEHOLDER_TRACKING_URL = 'Pending updation';

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 max-w-6xl">
        {/* Page header */}
        <div className="mb-8 pb-6 border-b border-hairline">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary hover:text-brand-primary transition-colors mb-5"
          >
            ← Back
          </button>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-coral">Order Details</p>
              <h1 className="mt-2 font-playfair text-3xl sm:text-4xl font-medium text-brand-primary tracking-tight">
                Order #{order.order_number}
              </h1>
              <p className="text-sm text-brand-secondary mt-1.5">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {order.status === 'delivered' && (
                <>
                  {canRequestReturn && (
                    <button
                      type="button"
                      onClick={() => setShowReturnModal(true)}
                      className="min-h-[42px] cursor-pointer rounded-full border border-hairline px-5 text-sm font-medium text-brand-primary hover:border-brand-ink dark:hover:border-brand-cream transition-colors"
                    >
                      Request return
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full border border-hairline px-5 text-sm font-medium text-brand-primary hover:border-brand-ink dark:hover:border-brand-cream transition-colors"
                  >
                    Download Invoice
                  </button>
                </>
              )}
              {needsRetryPayment && (
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={isRetryingPayment}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-brand-ink px-6 text-sm font-medium text-brand-cream hover:bg-black disabled:opacity-60 dark:bg-brand-cream dark:text-brand-ink"
                >
                  {isRetryingPayment ? 'Redirecting…' : 'Complete Payment'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 12-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Status + Progress Timeline */}
            <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-hairline">
                {[
                  { label: 'Order Status', value: order.status, color: getStatusColor(order.status) },
                  { label: 'Payment', value: order.payment_status, color: getPaymentStatusColor(order.payment_status) },
                  {
                    label: 'Method',
                    value: order.gateway,
                    color: 'border border-hairline text-brand-primary',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center justify-center text-center px-3 py-5 gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-secondary">{label}</p>
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${color}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {!isCancelled && currentStepIndex >= 0 && (
                <div className="border-t border-hairline px-6 py-6">
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 right-0 top-[18px] h-px bg-hairline" />
                    <div
                      className="absolute left-0 top-[18px] h-px bg-brand-coral transition-all duration-500"
                      style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                    />

                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx < currentStepIndex;
                      const active = idx === currentStepIndex;
                      return (
                        <div key={step} className="relative flex flex-col items-center gap-2 z-10">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
                              done
                                ? 'bg-brand-ink border-brand-ink text-brand-cream dark:bg-brand-cream dark:border-brand-cream dark:text-brand-ink'
                                : active
                                  ? 'bg-brand-coral border-brand-coral text-white ring-4 ring-brand-coral/20'
                                  : 'bg-brand-bg border-hairline text-brand-secondary'
                            }`}
                          >
                            {done ? '✓' : STEP_ICONS[step] || <span>{idx + 1}</span>}
                          </div>
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.12em] hidden sm:block ${
                              done || active ? 'text-brand-primary' : 'text-brand-secondary'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isCancelled && (
                <div className="border-t border-hairline px-6 py-4">
                  <p className="text-sm text-red-500 font-medium">This order has been cancelled.</p>
                </div>
              )}
            </div>

            {/* Shipping & tracking */}
            {showShippingDetailsSection && (
              <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Fulfillment</p>
                <h2 className="mt-1 font-playfair text-xl font-medium text-brand-primary mb-5">Shipping &amp; tracking</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-secondary mb-1">Courier</p>
                    <p className={`text-sm font-medium ${courierName ? 'text-brand-primary' : 'text-brand-secondary italic'}`}>
                      {courierName || PLACEHOLDER_COURIER}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-secondary mb-1">Tracking ID</p>
                    <p className={`text-sm font-medium ${trackingNo ? 'text-brand-primary font-mono' : 'text-brand-secondary italic'}`}>
                      {trackingNo || PLACEHOLDER_TRACKING_ID}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-secondary mb-1">Live tracking</p>
                    {trackingLink ? (
                      <a
                        href={trackingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-coral hover:underline"
                      >
                        Track shipment →
                      </a>
                    ) : (
                      <p className="text-sm text-brand-secondary italic">{PLACEHOLDER_TRACKING_URL}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order items */}
            <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-hairline flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-medium text-brand-primary">
                  Pieces in this order
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-secondary">
                  {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="divide-y divide-hairline">
                {order.items?.map((item: any) => {
                  const product = products[item.product_id];
                  const thumbSrc =
                    item.mockup_image_url ||
                    item.custom_image_url ||
                    product?.main_image_url;
                  return (
                    <div key={item.id} className="flex gap-4 p-5 sm:p-6">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-wall p-1.5 flex items-center justify-center">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={item.product_name}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="font-mono text-[10px] text-brand-secondary">ART</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-medium text-brand-primary leading-snug">
                          {item.product_name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-brand-secondary">
                          {item.material && (
                            <span className="rounded-full border border-hairline px-2.5 py-0.5 text-brand-primary">
                              {String(item.material).replace(/_/g, ' ')}
                            </span>
                          )}
                          {item.size && (
                            <span className="rounded-full border border-hairline px-2.5 py-0.5">
                              {item.size}
                            </span>
                          )}
                          {item.custom_art_request_id && (
                            <span className="rounded-full border border-brand-coral/40 px-2.5 py-0.5 text-brand-coral">
                              Your Art
                            </span>
                          )}
                          <span className="px-1 py-0.5">Qty {item.quantity}</span>
                        </div>

                        {order.status === 'delivered' && item.product_id && (
                          <div className="mt-3">
                            {userRatings[item.product_id] ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProduct({
                                    id: item.product_id,
                                    name: item.product_name,
                                    imageUrl: product?.main_image_url || product?.imageUrl,
                                  });
                                  setRatingModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 text-xs text-brand-secondary hover:text-brand-primary transition-colors"
                              >
                                <StarRating rating={userRatings[item.product_id]} readonly size="sm" />
                                <span className="underline underline-offset-2">Edit rating</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProduct({
                                    id: item.product_id,
                                    name: item.product_name,
                                    imageUrl: product?.main_image_url || product?.imageUrl,
                                  });
                                  setRatingModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-coral hover:underline"
                              >
                                ★ Rate this piece
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[15px] font-medium text-brand-primary tabular-nums">{formatPrice(item.total_price)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-brand-secondary mt-0.5 tabular-nums">{formatPrice(item.unit_price)} each</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {orderReturns.length > 0 && (
              <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-hairline">
                  <h2 className="font-playfair text-xl font-medium text-brand-primary">Return requests</h2>
                </div>
                <div className="divide-y divide-hairline">
                  {orderReturns.map((ret: any) => (
                    <div key={ret.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-brand-primary">
                          {ret.return_number || 'Pending review'}
                        </p>
                        <p className="text-xs text-brand-secondary mt-0.5 capitalize">
                          {ret.type} · {ret.reason?.replace(/_/g, ' ')}
                        </p>
                        {ret.return_ship_instructions && ret.status === 'approved' && (
                          <p className="text-xs text-brand-secondary mt-2">{ret.return_ship_instructions}</p>
                        )}
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border border-hairline text-amber-600 dark:text-amber-400">
                        {ret.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping address */}
            {order.user && (
              <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Delivery</p>
                <h2 className="mt-1 font-playfair text-xl font-medium text-brand-primary mb-4">Shipping address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium text-brand-primary">
                      {order.user.first_name} {order.user.last_name}
                    </p>
                    <p className="text-brand-secondary">{order.user.address1}</p>
                    {order.user.address2 && <p className="text-brand-secondary">{order.user.address2}</p>}
                    <p className="text-brand-secondary">
                      {order.user.city}, {order.user.province} {order.user.zip}
                    </p>
                    <p className="text-brand-secondary">{order.user.country_code}</p>
                  </div>
                  <div className="space-y-3 sm:pl-6 sm:border-l sm:border-hairline">
                    {order.user.phone && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-secondary mb-0.5">Phone</p>
                        <p className="text-brand-primary font-medium">{order.user.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-secondary mb-0.5">Email</p>
                      <p className="text-brand-primary font-medium break-all">{order.user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-6 space-y-4">
              <h2 className="font-playfair text-xl font-medium text-brand-primary">Order summary</h2>
              <div className="space-y-2.5 pt-2 border-t border-hairline">
                {[
                  { label: 'Subtotal', value: formatPrice(order.subtotal), show: true },
                  { label: 'Discount', value: `-${formatPrice(discountAmount)}`, show: discountAmount > 0, accent: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Tax (GST)', value: formatPrice(order.tax_amount), show: order.tax_amount > 0 },
                  { label: 'Shipping', value: order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'Complimentary', show: true },
                  { label: 'COD Fee', value: formatPrice(order.cod_fee), show: order.cod_fee > 0 && order.gateway === 'COD' },
                ].filter((r) => r.show).map(({ label, value, accent }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <span className="text-brand-secondary">{label}</span>
                    <span className={`font-medium tabular-nums ${accent || 'text-brand-primary'}`}>{value}</span>
                  </div>
                ))}

                <div className="pt-3 border-t border-hairline flex justify-between items-baseline">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">Total</span>
                  <span className="text-2xl font-medium text-brand-primary tabular-nums">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {order.payment && (
              <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-6 space-y-4">
                <h2 className="font-playfair text-xl font-medium text-brand-primary">Payment</h2>
                <div className="space-y-3 pt-2 border-t border-hairline text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-secondary">Method</span>
                    <span className="text-brand-primary font-medium">{order.payment.payment_method || order.gateway}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-secondary">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getPaymentStatusColor(order.payment.status)}`}>
                      {order.payment.status}
                    </span>
                  </div>
                  {order.payment.razorpay_payment_id && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-secondary mb-1">Transaction ID</p>
                      <p className="text-brand-primary font-mono text-xs break-all bg-wall rounded-lg px-3 py-2">
                        {order.payment.razorpay_payment_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-hairline p-6">
              <h3 className="text-sm font-medium text-brand-primary mb-1.5">Questions about your print?</h3>
              <p className="text-xs text-brand-secondary mb-3 leading-relaxed">
                Reach out to our studio team with your order number.
              </p>
              <a
                href="mailto:support@tinge.in"
                className="inline-flex items-center gap-2 text-xs font-medium text-brand-coral hover:underline"
              >
                support@tinge.in →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Product Modal */}
      {selectedProduct && (
        <RateProductModal
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          productImageUrl={selectedProduct.imageUrl}
          orderNumber={orderNumberParam!}
          email={!isAuthenticated ? searchParams.get('email') || undefined : undefined}
          onSuccess={(rating) => {
            setUserRatings((prev) => ({ ...prev, [selectedProduct.id]: rating }));
            setRatingModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {orderNumberParam && (
        <ReturnRequestModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          orderNumber={orderNumberParam}
          email={resolveEmail()}
          onSuccess={() => {
            const email = resolveEmail();
            fetchOrderDetails(orderNumberParam, email || undefined, { silent: true });
          }}
        />
      )}
    </div>
  );
};

