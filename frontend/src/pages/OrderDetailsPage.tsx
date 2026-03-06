import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { RateProductModal } from '../components/RateProductModal';
import { StarRating } from '../components/StarRating';
import api from '../services/api';
import { useApp } from '../context/AppContext';

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
  const { isAuthenticated } = useApp();
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

  const resolveEmail = useCallback(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery?.trim()) return fromQuery.trim();
    if (isAuthenticated) return null;
    return getGuestEmailFromStorage();
  }, [searchParams, isAuthenticated]);

  const fetchOrderDetails = useCallback(async (orderNumber: string, email?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      setShowLookupForm(false);

      let response;
      if (isAuthenticated) {
        response = await api.getOrderByNumber(orderNumber);
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
        <p className="mt-4 text-brand-secondary">Loading order details...</p>
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto bg-brand-surface rounded-lg border border-white/10 p-8 shadow-lg">
          <h1 className="text-xl font-bold font-display text-brand-primary mb-2 text-center">
            View order details
          </h1>
          <p className="text-brand-secondary text-sm text-center mb-6">
            Enter your order number and email to continue.
          </p>
          {error && (
            <p className="text-amber-600 dark:text-amber-400 text-sm mb-4 text-center bg-amber-500/10 rounded-lg py-2 px-3">
              {error}
            </p>
          )}
          <form onSubmit={handleLookupSubmit} className="space-y-4">
            <div>
              <label htmlFor="lookup-order-number" className="block text-sm font-medium text-brand-secondary mb-2">
                Order number
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
              <label htmlFor="lookup-email" className="block text-sm font-medium text-brand-secondary mb-2">
                Email address
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading…' : 'View order'}
            </Button>
          </form>
          <Button variant="outline" className="w-full mt-3" onClick={() => navigate('/')}>
            Go to home
          </Button>
        </div>
      </div>
    );
  }

  if (error && !order && !showLookupForm) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-brand-secondary mb-4">{error}</p>
        <Button onClick={() => navigate('/')}>Go home</Button>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const originalTotal =
    (order.subtotal || 0) +
    (order.tax_amount || 0) +
    (order.shipping_cost || 0) +
    (order.cod_fee || 0);

  const discountAmount =
    typeof order.discount_amount === 'number'
      ? order.discount_amount
      : Math.max(0, originalTotal - (order.total_amount || 0));

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header: Back + Heading in same row, subheading below */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="shrink-0">
            ← Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display text-brand-primary">
              <span className="font-medium text-brand-secondary">Order: </span>
              <span className="font-bold">#{order.order_number}</span>
            </h1>
            <p className="text-brand-secondary text-sm mt-1">Placed on {formatDate(order.created_at)}</p>
          </div>
          {order.status === 'delivered' && (
            <Button variant="secondary" onClick={handleDownloadInvoice} className="shrink-0">
              Download Invoice (PDF)
            </Button>
          )}
        </div>

        {/* Order Status – 33% each, centered, pill badges */}
        <div className="bg-brand-surface rounded-xl border border-white/10 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center text-center min-w-0">
              <p className="text-xs uppercase tracking-wide text-brand-secondary mb-2 font-medium">Order Status</p>
              <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center min-w-0">
              <p className="text-xs uppercase tracking-wide text-brand-secondary mb-2 font-medium">Payment Status</p>
              <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center min-w-0">
              <p className="text-xs uppercase tracking-wide text-brand-secondary mb-2 font-medium">Payment Method</p>
              <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {order.gateway}
              </span>
            </div>
          </div>

          {/* Tracking Information - Show when order is shipped or delivered */}
          {(order.status === 'shipped' || order.status === 'delivered') && 
           (order.tracking_number || order.tracking_url || order.shipping_partner) && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-brand-primary mb-4">Tracking Information</h3>
              <div className="space-y-3">
                {order.shipping_partner && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-secondary mb-1.5 font-medium">Shipping Partner</p>
                    <p className="text-brand-primary font-semibold text-base">{order.shipping_partner}</p>
                  </div>
                )}
                {order.tracking_number && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-secondary mb-1.5 font-medium">Tracking Number</p>
                    <p className="text-brand-primary font-mono font-semibold text-base">{order.tracking_number}</p>
                  </div>
                )}
                {order.tracking_url && (
                  <div>
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:text-purple-400 underline font-semibold inline-flex items-center gap-2 text-base"
                    >
                      Track Your Order
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-brand-surface rounded-xl border border-white/10 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-brand-primary mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item: any) => {
              const product = products[item.product_id];
              return (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-brand-surface border border-white/10">
                    {product?.main_image_url ? (
                      <img
                        src={product.main_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-secondary text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-brand-primary mb-2">{item.product_name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {item.size && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Size:</span>
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{item.size}</span>
                        </span>
                      )}
                      {item.color && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Color:</span>
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{item.color}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Qty:</span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{item.quantity}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div>
                      <p className="font-semibold text-brand-primary">{formatPrice(item.total_price)}</p>
                      <p className="text-sm text-brand-secondary">{formatPrice(item.unit_price)} each</p>
                    </div>
                    
                    {/* Rating Button (only for delivered orders) */}
                    {order.status === 'delivered' && item.product_id && (
                      <div className="mt-2">
                        {userRatings[item.product_id] ? (
                          <button
                            onClick={() => {
                              setSelectedProduct({ 
                                id: item.product_id, 
                                name: item.product_name,
                                imageUrl: product?.main_image_url || product?.imageUrl
                              });
                              setRatingModalOpen(true);
                            }}
                            className="flex flex-col items-end gap-1 text-xs hover:opacity-80 transition-opacity"
                          >
                            <span className="text-brand-secondary">Your rating:</span>
                            <StarRating rating={userRatings[item.product_id]} readonly size="sm" />
                          </button>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedProduct({ 
                                id: item.product_id, 
                                name: item.product_name,
                                imageUrl: product?.main_image_url || product?.imageUrl
                              });
                              setRatingModalOpen(true);
                            }}
                            variant="outline"
                            className="text-xs py-1 px-3"
                          >
                            Rate Product
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping Address – 2 columns: name+address | phone+email */}
        {order.user && (
          <div className="bg-brand-surface rounded-xl border border-white/10 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-brand-primary mb-4">Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="font-semibold text-brand-primary text-base mb-1">
                  {order.user.first_name} {order.user.last_name}
                </p>
                <p className="text-brand-secondary text-sm">{order.user.address1}</p>
                {order.user.address2 && <p className="text-brand-secondary text-sm">{order.user.address2}</p>}
                <p className="text-brand-secondary text-sm">
                  {order.user.city}, {order.user.province} {order.user.zip}
                </p>
                <p className="text-brand-secondary text-sm">{order.user.country_code}</p>
              </div>
              <div className="space-y-2 sm:border-l sm:border-white/10 sm:pl-6">
                {order.user.phone && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-secondary font-medium mb-0.5">Phone</p>
                    <p className="text-sm font-semibold text-brand-primary">{order.user.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-secondary font-medium mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-brand-primary break-all">{order.user.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        {order.payment && (
          <div className="bg-brand-surface rounded-xl border border-white/10 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-brand-primary mb-4">Payment Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Payment Method</span>
                <span className="text-brand-primary font-semibold text-base">
                  {order.payment.payment_method || order.gateway}
                </span>
              </div>
              {order.payment.razorpay_payment_id && (
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Transaction ID</span>
                  <span className="text-brand-primary font-mono font-semibold text-xs">
                    {order.payment.razorpay_payment_id}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Payment Status</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${getPaymentStatusColor(order.payment.status)}`}>
                  {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-brand-surface rounded-xl border border-white/10 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-brand-primary mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Subtotal</span>
              <span className="font-semibold text-brand-primary text-base">{formatPrice(order.subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Discount</span>
                <span className="font-semibold text-brand-primary text-base">
                  -{formatPrice(discountAmount)}
                </span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Tax</span>
                <span className="font-semibold text-brand-primary text-base">{formatPrice(order.tax_amount)}</span>
              </div>
            )}
            {order.shipping_cost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">Shipping</span>
                <span className="font-semibold text-brand-primary text-base">{formatPrice(order.shipping_cost)}</span>
              </div>
            )}
            {order.cod_fee > 0 && order.gateway === 'COD' && (
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wide text-brand-secondary font-medium">COD Fee</span>
                <span className="font-semibold text-brand-primary text-base">{formatPrice(order.cod_fee)}</span>
              </div>
            )}
            <div className="border-t-2 border-white/20 pt-3 mt-2 flex justify-between items-center">
              <span className="text-sm uppercase tracking-wide text-brand-primary font-bold">Total</span>
              <span className="text-xl font-bold text-brand-primary">{formatPrice(order.total_amount)}</span>
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

