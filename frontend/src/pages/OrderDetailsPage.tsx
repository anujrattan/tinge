import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { RateProductModal } from '../components/RateProductModal';
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
  const cancellationHandledRef = useRef(false);

  const resolveEmail = useCallback(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery?.trim()) return fromQuery.trim();
    if (isAuthenticated) return user?.email?.trim() || null;
    return getGuestEmailFromStorage();
  }, [searchParams, isAuthenticated, user?.email]);

  const fetchOrderDetails = useCallback(async (orderNumber: string, email?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      setShowLookupForm(false);

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
        setLoading(false);
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
          if (product) products[product.id] = product;
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
      } else {
        setError('We couldn’t find an order with that number and email. Please check and try again.');
        setShowLookupForm(true);
        setLookupOrderNumber(orderNumber);
        setLookupEmail(email || '');
      }
    } catch (err: any) {
      setError(err.message || 'We couldn’t load this order. Please check your details and try again.');
      setShowLookupForm(true);
      setLookupOrderNumber(orderNumber);
      setLookupEmail(resolveEmail() || '');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, resolveEmail]);

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
        name: 'Tinge Clothing',
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm" />
          </div>
          <p className="text-brand-secondary text-sm tracking-widest uppercase">Loading your order</p>
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
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        {/* Decorative blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/5 dark:bg-white/5 border border-white/15 rounded-2xl shadow-2xl p-8">
            {/* Icon accent */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-display font-bold text-brand-primary mb-1.5 text-center">Track Your Order</h1>
            <p className="text-brand-secondary text-sm text-center mb-7">
              Enter your order number and email address to view details.
            </p>
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl py-3 px-4">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-amber-600 dark:text-amber-400 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div>
                <label htmlFor="lookup-order-number" className="block text-xs uppercase tracking-widest text-brand-secondary mb-2 font-medium">
                  Order Number
                </label>
                <Input
                  id="lookup-order-number"
                  type="text"
                  value={lookupOrderNumber}
                  onChange={(e) => setLookupOrderNumber(e.target.value)}
                  placeholder="e.g. TC-241229-0001"
                  required
                />
              </div>
              <div>
                <label htmlFor="lookup-email" className="block text-xs uppercase tracking-widest text-brand-secondary mb-2 font-medium">
                  Email Address
                </label>
                <Input
                  id="lookup-email"
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? 'Searching…' : 'View Order'}
              </Button>
            </form>
            <button
              onClick={() => navigate('/')}
              className="w-full mt-3 text-sm text-brand-secondary hover:text-brand-primary transition-colors text-center py-2"
            >
              ← Return to Home
            </button>
          </div>
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

  return (
    <div className="relative min-h-screen">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-sm text-brand-secondary hover:text-brand-primary transition-colors mb-5"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary font-medium mb-1">Order Details</p>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-brand-primary tracking-tight">
                #{order.order_number}
              </h1>
              <p className="text-sm text-brand-secondary mt-1.5">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {order.status === 'delivered' && (
                <button
                  onClick={handleDownloadInvoice}
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-sm font-medium text-brand-secondary hover:text-brand-primary hover:bg-white/10 hover:border-white/25 transition-all duration-200"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Invoice
                </button>
              )}
              {needsRetryPayment && (
                <button
                  onClick={handleRetryPayment}
                  disabled={isRetryingPayment}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRetryingPayment ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry Payment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Two-column layout on desktop ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left / main column ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Status banner */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              {/* Status pills row */}
              <div className="grid grid-cols-3 divide-x divide-white/10">
                {[
                  { label: 'Order Status', value: order.status, color: getStatusColor(order.status) },
                  { label: 'Payment', value: order.payment_status, color: getPaymentStatusColor(order.payment_status) },
                  {
                    label: 'Method',
                    value: order.gateway,
                    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center justify-center text-center px-4 py-5 gap-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brand-secondary font-semibold">{label}</p>
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${color}`}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress timeline – hidden for cancelled orders */}
              {!isCancelled && currentStepIndex >= 0 && (
                <div className="border-t border-white/10 px-6 py-5">
                  <div className="relative flex items-center justify-between">
                    {/* connecting line */}
                    <div className="absolute left-0 right-0 top-[18px] h-px bg-white/10" />
                    <div
                      className="absolute left-0 top-[18px] h-px bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                      style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                    />

                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx < currentStepIndex;
                      const active = idx === currentStepIndex;
                      return (
                        <div key={step} className="relative flex flex-col items-center gap-2 z-10">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                              done
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                                : active
                                ? 'bg-white/10 border-purple-500/60 text-purple-400 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20'
                                : 'bg-white/5 border-white/15 text-brand-secondary'
                            }`}
                          >
                            {done ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              STEP_ICONS[step] || <span>{idx + 1}</span>
                            )}
                          </div>
                          <span className={`text-[10px] uppercase tracking-wide font-medium hidden sm:block ${
                            done || active ? 'text-brand-primary' : 'text-brand-secondary'
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cancelled banner */}
              {isCancelled && (
                <div className="border-t border-white/10 px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-400 font-medium">This order has been cancelled.</p>
                </div>
              )}
            </div>

            {/* Tracking info – when shipped / delivered */}
            {(order.status === 'shipped' || order.status === 'delivered') &&
              (order.tracking_number || order.tracking_url || order.shipping_partner) && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl p-6 shadow-xl shadow-black/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-brand-primary">Tracking Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {order.shipping_partner && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-secondary mb-1.5 font-medium">Shipping Partner</p>
                      <p className="text-brand-primary font-semibold">{order.shipping_partner}</p>
                    </div>
                  )}
                  {order.tracking_number && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-secondary mb-1.5 font-medium">Tracking Number</p>
                      <p className="text-brand-primary font-mono font-semibold text-sm">{order.tracking_number}</p>
                    </div>
                  )}
                </div>
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 text-sm font-semibold transition-all duration-200"
                  >
                    Track your shipment
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Order items */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-brand-primary">
                  {order.items?.length} {order.items?.length === 1 ? 'Item' : 'Items'}
                </h2>
              </div>

              <div className="divide-y divide-white/10">
                {order.items?.map((item: any) => {
                  const product = products[item.product_id];
                  return (
                    <div
                      key={item.id}
                      className="group flex gap-4 p-5 hover:bg-white/[0.03] transition-colors duration-200"
                    >
                      {/* Product image */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                        {product?.main_image_url ? (
                          <img
                            src={product.main_image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-brand-secondary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-brand-primary mb-2.5 text-sm sm:text-base leading-snug">
                          {item.product_name}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {item.size && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-500">
                              {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] font-semibold text-purple-400">
                              {item.color}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/15 text-[11px] font-semibold text-brand-secondary">
                            Qty {item.quantity}
                          </span>
                        </div>

                        {/* Rating */}
                        {order.status === 'delivered' && item.product_id && (
                          <div className="mt-3">
                            {userRatings[item.product_id] ? (
                              <button
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
                                <span className="underline underline-offset-2 opacity-70 hover:opacity-100">Edit rating</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedProduct({
                                    id: item.product_id,
                                    name: item.product_name,
                                    imageUrl: product?.main_image_url || product?.imageUrl,
                                  });
                                  setRatingModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors group/rate"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Rate this product
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-brand-primary">{formatPrice(item.total_price)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-brand-secondary mt-0.5">{formatPrice(item.unit_price)} each</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping address */}
            {order.user && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl p-6 shadow-xl shadow-black/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-brand-primary">Shipping Address</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-0.5">
                    <p className="font-bold text-brand-primary text-sm">
                      {order.user.first_name} {order.user.last_name}
                    </p>
                    <p className="text-brand-secondary text-sm">{order.user.address1}</p>
                    {order.user.address2 && <p className="text-brand-secondary text-sm">{order.user.address2}</p>}
                    <p className="text-brand-secondary text-sm">
                      {order.user.city}, {order.user.province} {order.user.zip}
                    </p>
                    <p className="text-brand-secondary text-sm">{order.user.country_code}</p>
                  </div>
                  <div className="space-y-4 sm:pl-6 sm:border-l sm:border-white/10">
                    {order.user.phone && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-brand-secondary font-medium mb-1">Phone</p>
                        <p className="text-brand-primary font-semibold text-sm">{order.user.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-secondary font-medium mb-1">Email</p>
                      <p className="text-brand-primary font-semibold text-sm break-all">{order.user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right / sidebar column ────────────────────────────────── */}
          <div className="space-y-6">
            {/* Order summary card */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-brand-primary">Order Summary</h2>
              </div>

              <div className="p-6 space-y-3">
                {[
                  { label: 'Subtotal', value: formatPrice(order.subtotal), show: true },
                  { label: 'Discount', value: `-${formatPrice(discountAmount)}`, show: discountAmount > 0, accent: 'text-emerald-400' },
                  { label: 'Tax (GST)', value: formatPrice(order.tax_amount), show: order.tax_amount > 0 },
                  { label: 'Shipping', value: order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'Free', show: true },
                  { label: 'COD Fee', value: formatPrice(order.cod_fee), show: order.cod_fee > 0 && order.gateway === 'COD' },
                ].filter((r) => r.show).map(({ label, value, accent }) => (
                  <div key={label} className="flex justify-between items-center text-sm">
                    <span className="text-brand-secondary">{label}</span>
                    <span className={`font-medium ${accent || 'text-brand-primary'}`}>{value}</span>
                  </div>
                ))}

                <div className="!mt-5 pt-4 border-t border-white/15">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-brand-primary uppercase tracking-widest">Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment details card */}
            {order.payment && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-brand-primary">Payment</h2>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-brand-secondary font-medium mb-1.5">Method</p>
                    <p className="text-brand-primary font-semibold text-sm">
                      {order.payment.payment_method || order.gateway}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-brand-secondary font-medium mb-1.5">Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusColor(order.payment.status)}`}>
                      {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                    </span>
                  </div>

                  {order.payment.razorpay_payment_id && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-secondary font-medium mb-1.5">Transaction ID</p>
                      <p className="text-brand-primary font-mono text-xs break-all leading-relaxed bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                        {order.payment.razorpay_payment_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Need help card */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/10">
              <h3 className="text-sm font-semibold text-brand-primary mb-1.5">Need Help?</h3>
              <p className="text-xs text-brand-secondary mb-4 leading-relaxed">
                Have a question about your order? Our team is here to help.
              </p>
              <a
                href="mailto:support@tingeapparel.com"
                className="group inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                support@tingeapparel.com
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
    </div>
  );
};

