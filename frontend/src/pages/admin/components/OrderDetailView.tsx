import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select } from '../../../components/ui';
import { XIcon, DownloadIcon, MapPinIcon, PackageIcon, ReceiptIcon, UserIcon, TruckIcon } from '../../../components/icons';
import { formatCurrency, CurrencyCode } from '../../../utils/currency';
import { normalizeSizeLabel } from '../../../utils/sizeSystem';
import api from '../../../services/api';

interface OrderDetailViewProps {
  order: any;
  orderProducts: Record<string, any>;
  currency: CurrencyCode;
  onClose: () => void;
  onSave: (
    orderNumber: string,
    changes: {
      status?: string;
      shipping_partner?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
      fulfillment_partner?: string | null;
      partner_order_id?: string | null;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  isSaving: boolean;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  orderProducts,
  currency,
  onClose,
  onSave,
  isSaving,
}) => {
  const normalizeSize = (value: any): string =>
    normalizeSizeLabel(String(value || '').trim()).replace(/\s+/g, '');

  const getPartnerVariantIdForItem = (item: any, product: any): string => {
    if (!product || !Array.isArray(product.partner_variants)) return '';
    const itemSize = normalizeSize(item?.size);
    if (!itemSize) return '';

    const match = product.partner_variants.find((variant: any) => {
      const variantSize = normalizeSize(variant?.size);
      return variantSize === itemSize;
    });

    if (match?.partner_variant_id) return String(match.partner_variant_id);

    // Fallback: if only one partner variant is available, use it.
    if (product.partner_variants.length === 1) {
      return String(product.partner_variants[0]?.partner_variant_id || '');
    }

    return '';
  };

  // Original values (from server) - used to detect changes and for cancel
  const [originalValues, setOriginalValues] = useState({
    status: order.status || 'pending',
    shipping_partner: order.shipping_partner || null,
    tracking_number: order.tracking_number || null,
    tracking_url: order.tracking_url || null,
    fulfillment_partner: order.fulfillment_partner || null,
    partner_order_id: order.partner_order_id || null,
  });

  // Current values (user edits) - local state
  const [currentValues, setCurrentValues] = useState(originalValues);

  // Update both original and current when order changes (e.g., after save)
  useEffect(() => {
    const newOriginal = {
      status: order.status || 'pending',
      shipping_partner: order.shipping_partner || null,
      tracking_number: order.tracking_number || null,
      tracking_url: order.tracking_url || null,
      fulfillment_partner: order.fulfillment_partner || null,
      partner_order_id: order.partner_order_id || null,
    };
    setOriginalValues(newOriginal);
    setCurrentValues(newOriginal);
  }, [order]);

  // Detect unsaved changes
  const hasUnsavedChanges = JSON.stringify(originalValues) !== JSON.stringify(currentValues);

  // Handle status change (local state only)
  const handleStatusChange = (newStatus: string) => {
    setCurrentValues({
      ...currentValues,
      status: newStatus,
    });
  };

  // Handle tracking field changes (local state only)
  const handleShippingPartnerChange = (value: string) => {
    setCurrentValues({
      ...currentValues,
      shipping_partner: value || null,
    });
  };

  const handleTrackingNumberChange = (value: string) => {
    setCurrentValues({
      ...currentValues,
      tracking_number: value || null,
    });
  };

  const handleTrackingUrlChange = (value: string) => {
    setCurrentValues({
      ...currentValues,
      tracking_url: value || null,
    });
  };

  // Handle fulfillment partner change (local state only)
  const handleFulfillmentPartnerChange = (newPartner: string) => {
    const partnerValue = newPartner === '' ? null : newPartner;
    setCurrentValues({
      ...currentValues,
      fulfillment_partner: partnerValue,
      // Clear partner order ID if fulfillment partner is removed
      ...(partnerValue === null && { partner_order_id: null }),
    });
  };

  // Handle partner order ID change (local state only)
  const handlePartnerOrderIdChange = (value: string) => {
    setCurrentValues({
      ...currentValues,
      partner_order_id: value.trim() || null,
    });
  };

  // ── Serviceability state ──────────────────────────────────────────────────
  const [couriers, setCouriers] = useState<Array<{ id: number; name: string; cost: number }>>([]);
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);
  const [serviceabilityError, setServiceabilityError] = useState<string | null>(null);
  const [serviceabilityChecked, setServiceabilityChecked] = useState(false);

  const orderPincode = order.users?.zip || '';
  const isCod = order.gateway === 'COD';

  const checkServiceability = async () => {
    if (!orderPincode) {
      setServiceabilityError("No pincode found for this order's shipping address.");
      return;
    }
    setServiceabilityLoading(true);
    setServiceabilityError(null);
    setCouriers([]);
    setServiceabilityChecked(false);
    try {
      const result = await api.checkPrintroveServiceability({
        country: 'India',
        pincode: orderPincode,
        weight: '500',
        cod: isCod ? 'true' : 'false',
      });
      if (result?.success && Array.isArray(result?.data?.couriers)) {
        setCouriers(result.data.couriers);
        setServiceabilityChecked(true);
      } else {
        setServiceabilityError(
          result?.data?.message || result?.data?.errors
            ? JSON.stringify(result?.data?.errors)
            : 'Unable to fetch shipping options. Please try again.'
        );
      }
    } catch (err: any) {
      setServiceabilityError(err.message || 'Failed to check serviceability.');
    } finally {
      setServiceabilityLoading(false);
    }
  };

  // Cancel - revert to original values
  const handleCancel = () => {
    setCurrentValues(originalValues);
  };

  // Save - calculate changes and call onSave
  const handleSave = async () => {
    // Calculate what actually changed
    const changes: any = {};

    const statusChanged = currentValues.status !== originalValues.status;
    const trackingChanged = 
      currentValues.shipping_partner !== originalValues.shipping_partner ||
      currentValues.tracking_number !== originalValues.tracking_number ||
      currentValues.tracking_url !== originalValues.tracking_url;

    // Group 1: Status + Tracking Info
    if (statusChanged) {
      changes.status = currentValues.status;
      // Always include tracking info when status changes (backend handles it)
      changes.shipping_partner = currentValues.shipping_partner;
      changes.tracking_number = currentValues.tracking_number;
      changes.tracking_url = currentValues.tracking_url;
    } else if (trackingChanged) {
      // Tracking changed without status change — include current status so backend processes it
      changes.status = currentValues.status;
      changes.shipping_partner = currentValues.shipping_partner;
      changes.tracking_number = currentValues.tracking_number;
      changes.tracking_url = currentValues.tracking_url;
    }

    // Group 2: Fulfillment Partner + Partner Order ID
    if (currentValues.fulfillment_partner !== originalValues.fulfillment_partner) {
      changes.fulfillment_partner = currentValues.fulfillment_partner;
    }

    if (currentValues.partner_order_id !== originalValues.partner_order_id) {
      changes.partner_order_id = currentValues.partner_order_id;
    }

    // If no changes, don't save
    if (Object.keys(changes).length === 0) {
      return;
    }

    // Call save function
    const result = await onSave(order.order_number, changes);
    
    if (!result.success && result.message) {
      // Error message will be shown by the hook's toast
    }
    // If successful, original values will be updated via useEffect when order prop updates
  };

  const handleDownloadInvoice = async () => {
    try {
      await api.downloadInvoice(order.order_number);
    } catch (err: any) {
      alert(err.message || 'Failed to download invoice. Please try again.');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-brand-primary">Order Details</h3>
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-500 font-medium">• Unsaved changes</span>
          )}
        </div>
        <Button onClick={onClose} variant="ghost" disabled={isSaving}>
          <XIcon className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-6">
        {/* Order Info */}
        <div className="p-6 rounded-lg border-2 border-purple-500/30 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-brand-secondary mb-1">Order Number</p>
            <p className="text-lg font-semibold text-brand-primary">{order.order_number}</p>
          </div>
          <div>
            <p className="text-sm text-brand-secondary mb-2">Status</p>
            <Select
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'processing', label: 'Processing' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'failed', label: 'Failed' },
              ]}
              value={currentValues.status}
              onChange={handleStatusChange}
              disabled={isSaving}
              className="min-w-[180px] border-2 border-gray-300 dark:border-white/30 rounded-lg"
            />
          </div>
          <div>
            <p className="text-sm text-brand-secondary mb-1">Payment Status</p>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
              order.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {order.payment_status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
          <div>
            <p className="text-sm text-brand-secondary mb-2">Fulfillment Partner</p>
            <Select
              options={[
                { value: '', label: 'Not Assigned' },
                { value: 'Qikink', label: 'Qikink' },
                { value: 'Printrove', label: 'Printrove' },
              ]}
              value={currentValues.fulfillment_partner || ''}
              onChange={handleFulfillmentPartnerChange}
              disabled={isSaving}
              className="min-w-[180px] border-2 border-gray-300 dark:border-white/30 rounded-lg"
            />
          </div>
          {currentValues.fulfillment_partner && (
            <div className="md:col-span-2 mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Left: Partner Variant IDs (read-only) */}
              <div className="p-3 rounded-lg border-2 border-gray-300 dark:border-white/30">
                <p className="text-xs font-medium text-brand-primary mb-2">
                  Printrove Partner Variant IDs (read-only)
                </p>
                <div className="space-y-1.5 max-h-36 overflow-auto">
                  {(order.items || []).map((item: any, idx: number) => {
                    const product = orderProducts[item.product_id];
                    const partnerVariantId = getPartnerVariantIdForItem(item, product);
                    return (
                      <div key={`${item.product_id}-${item.size}-${idx}`} className="text-xs">
                        <span className="text-brand-secondary">
                          {item.product_name} · {item.size} · {item.color}
                        </span>
                        <div className="mt-0.5 px-2 py-1 rounded-md border-2 border-gray-300 dark:border-white/30 font-mono text-brand-primary break-all">
                          {partnerVariantId || 'Not mapped'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Partner Order ID input */}
              <div>
                <p className="text-sm text-brand-secondary mb-2">
                  {currentValues.fulfillment_partner} Order ID
                </p>
                <Input
                  type="text"
                  value={currentValues.partner_order_id || ''}
                  onChange={(e) => handlePartnerOrderIdChange(e.target.value)}
                  placeholder={`Enter ${currentValues.fulfillment_partner} order ID`}
                  disabled={isSaving}
                  className="w-full border-2 border-gray-300 dark:border-white/30 rounded-lg"
                />
              </div>
            </div>
          )}
          <div>
            <p className="text-sm text-brand-secondary mb-1">Date</p>
            <p className="text-sm text-brand-primary">
              {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        </div>

        {/* Customer Info */}
        {order.users && (
          <div className="border-t-2 border-purple-500/30 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg border border-blue-500/30 bg-blue-500/10">
                <UserIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-brand-primary">Customer Information</h4>
            </div>
            <div className="p-4 rounded-lg border-2 border-purple-500/30 shadow-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-brand-secondary mb-1">Name</p>
                  <p className="text-brand-primary">{order.users.first_name} {order.users.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-brand-secondary mb-1">Email</p>
                  <p className="text-brand-primary">{order.users.email}</p>
                </div>
                {order.users.phone && (
                  <div>
                    <p className="text-sm text-brand-secondary mb-1">Phone</p>
                    <p className="text-brand-primary">{order.users.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.users && (
          <div className="border-t-2 border-purple-500/30 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg border border-purple-500/30 bg-purple-500/10">
                <MapPinIcon className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold text-brand-primary">Shipping Address</h4>
            </div>
            <div className="p-4 rounded-lg border-2 border-purple-500/30 shadow-lg">
              <p className="text-brand-primary font-medium">
                {order.users.first_name} {order.users.last_name}
              </p>
              <p className="text-brand-primary">{order.users.address1}</p>
              {order.users.address2 && (
                <p className="text-brand-primary">{order.users.address2}</p>
              )}
              <p className="text-brand-primary">
                {order.users.city}, {order.users.province} {order.users.zip}
              </p>
              <p className="text-brand-primary">{order.users.country_code}</p>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="border-t-2 border-purple-500/30 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg border border-orange-500/30 bg-orange-500/10">
              <PackageIcon className="w-5 h-5 text-orange-400" />
            </div>
            <h4 className="text-lg font-semibold text-brand-primary">Order Items</h4>
          </div>
          <div className="space-y-3">
            {order.items?.map((item: any, index: number) => {
              const product = orderProducts[item.product_id];
              return (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-white/10 shadow-sm">
                  <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-brand-surface border border-white/10">
                    {product?.main_image_url ? (
                      <img
                        src={product.main_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-secondary text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-brand-primary">{item.product_name}</p>
                    <p className="text-sm text-brand-secondary">
                      Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-primary">
                      {formatCurrency(item.total_price, currency)}
                    </p>
                    <p className="text-xs text-brand-secondary">
                      {formatCurrency(item.unit_price, currency)} each
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="border-t-2 border-purple-500/30 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg border border-green-500/30 bg-green-500/10">
              <ReceiptIcon className="w-5 h-5 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-brand-primary">Order Summary</h4>
          </div>
          <div className="p-4 rounded-lg space-y-2 border-2 border-purple-500/30 shadow-lg">
            <div className="flex justify-between text-sm">
              <span className="text-brand-secondary">Subtotal</span>
              <span className="text-brand-primary">
                {formatCurrency(order.subtotal, currency)}
              </span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-secondary">Discount</span>
                <span className="text-brand-primary">
                  -{formatCurrency(order.discount_amount, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-brand-secondary">Tax</span>
              <span className="text-brand-primary">
                {formatCurrency(order.tax_amount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-secondary">Shipping</span>
              <span className="text-brand-primary">{formatCurrency(order.shipping_cost, currency)}</span>
            </div>
            {order.cod_fee > 0 && order.gateway === 'COD' && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-secondary">COD Fee</span>
                <span className="text-brand-primary">{formatCurrency(order.cod_fee, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2 mt-2">
              <span className="text-brand-primary">Total</span>
              <span className="text-brand-primary">{formatCurrency(order.total_amount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-brand-secondary">Payment Gateway</span>
              <span className="text-brand-primary">{order.gateway || 'COD'}</span>
            </div>
          </div>
        </div>

        {/* Shipping Details */}
        <div className="border-t-2 border-purple-500/30 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <TruckIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <h4 className="text-lg font-semibold text-brand-primary">Shipping Details</h4>
          </div>
          <div className="p-4 rounded-lg border-2 border-purple-500/30 shadow-lg space-y-4">

            {/* Meta row: pincode, weight, COD + Check button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-3 text-xs text-brand-secondary flex-1">
                <span>
                  Pincode:&nbsp;
                  <span className="font-mono font-semibold text-brand-primary">
                    {orderPincode || <span className="text-red-400">Not found</span>}
                  </span>
                </span>
                <span>
                  Weight:&nbsp;
                  <span className="font-mono font-semibold text-brand-primary">500g</span>
                </span>
                <span>
                  COD:&nbsp;
                  <span className="font-mono font-semibold text-brand-primary">{isCod ? 'Yes' : 'No'}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={checkServiceability}
                disabled={serviceabilityLoading || !orderPincode || isSaving}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                {serviceabilityLoading ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Checking…
                  </>
                ) : serviceabilityChecked ? 'Refresh Options' : 'Check Shipping Options'}
              </button>
            </div>

            {/* Error */}
            {serviceabilityError && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {serviceabilityError}
              </p>
            )}

            {/* Courier dropdown — shown when live options loaded OR when a saved value exists */}
            {(serviceabilityChecked || currentValues.shipping_partner) && (
              <div>
                <label className="block text-xs text-brand-secondary mb-1.5">Courier</label>
                <Select
                  options={
                    serviceabilityChecked && couriers.length > 0
                      ? [
                          { value: '', label: 'Select a courier…' },
                          ...couriers.map((c) => ({
                            value: c.name,
                            label: `${c.name}  ·  ₹${c.cost}`,
                          })),
                        ]
                      : [
                          { value: '', label: 'Select a courier…' },
                          // Keep saved value as the only option until a live check is run
                          ...(currentValues.shipping_partner
                            ? [{ value: currentValues.shipping_partner, label: currentValues.shipping_partner }]
                            : []),
                        ]
                  }
                  value={currentValues.shipping_partner || ''}
                  onChange={handleShippingPartnerChange}
                  disabled={isSaving}
                  className="border-2 border-gray-300 dark:border-white/30 rounded-lg"
                />
                {!serviceabilityChecked && currentValues.shipping_partner && (
                  <p className="text-xs text-brand-secondary mt-1">
                    Pre-filled from saved data. Click &ldquo;Check Shipping Options&rdquo; to see all available couriers.
                  </p>
                )}
                {currentValues.shipping_partner && currentValues.shipping_partner !== originalValues.shipping_partner && (
                  <p className="text-xs text-yellow-500 mt-1.5">
                    ✓ Changed to <span className="font-medium">{currentValues.shipping_partner}</span> — click &ldquo;Save Changes&rdquo; to persist.
                  </p>
                )}
              </div>
            )}

            {/* No couriers available after a check */}
            {serviceabilityChecked && couriers.length === 0 && !currentValues.shipping_partner && (
              <p className="text-xs text-brand-secondary">
                No courier options available for this pincode.
              </p>
            )}

            {/* Tracking Number + URL — read-only, populated by Printrove after order creation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs text-brand-secondary mb-1">Tracking Number</label>
                <div className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-white/30 bg-gray-50 dark:bg-white/5 text-sm font-mono text-brand-primary min-h-[38px]">
                  {currentValues.tracking_number || (
                    <span className="text-gray-400 text-xs font-sans">Populated after Printrove order is created</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-brand-secondary mb-1">Tracking URL</label>
                {currentValues.tracking_url ? (
                  <a
                    href={currentValues.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg border-2 border-cyan-500/40 bg-cyan-500/5 text-sm text-cyan-500 hover:text-cyan-400 hover:border-cyan-500/60 transition-colors truncate"
                  >
                    <span className="truncate">{currentValues.tracking_url}</span>
                    <span className="flex-shrink-0 text-[10px]">↗</span>
                  </a>
                ) : (
                  <div className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-white/30 bg-gray-50 dark:bg-white/5 text-sm min-h-[38px]">
                    <span className="text-gray-400 text-xs">Populated after Printrove order is created</span>
                  </div>
                )}
              </div>
            </div>
            {(currentValues.status === 'shipped' || currentValues.status === 'delivered') &&
              !currentValues.shipping_partner && !currentValues.tracking_number && !currentValues.tracking_url && (
              <p className="text-xs text-amber-500">
                ⚠ Select a courier before marking the order as Shipped.
              </p>
            )}

          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadInvoice}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-purple-500/50 hover:border-purple-500 text-brand-primary hover:bg-purple-500/10"
          >
            <DownloadIcon className="w-4 h-4" />
            Download Invoice
          </Button>
          {hasUnsavedChanges && (
            <Button 
              onClick={handleCancel} 
              variant="outline"
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasUnsavedChanges || isSaving}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

