import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select } from '../../../components/ui';
import { XIcon, DownloadIcon, MapPinIcon, PackageIcon, ReceiptIcon, UserIcon } from '../../../components/icons';
import { formatCurrency, CurrencyCode } from '../../../utils/currency';
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

  // Show tracking fields when status is "shipped" or "delivered" (current or original)
  const showTrackingFields = 
    currentValues.status === 'shipped' || 
    currentValues.status === 'delivered' ||
    originalValues.status === 'shipped' ||
    originalValues.status === 'delivered';

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
      
      // If status changed to "shipped" or "delivered", include tracking info (even if unchanged)
      if (currentValues.status === 'shipped' || currentValues.status === 'delivered') {
        changes.shipping_partner = currentValues.shipping_partner;
        changes.tracking_number = currentValues.tracking_number;
        changes.tracking_url = currentValues.tracking_url;
      }
    } else if (trackingChanged) {
      // Tracking info changed - include it if status is "shipped" or "delivered"
      // Always include the current status so backend knows which status to update tracking for
      if (currentValues.status === 'shipped' || currentValues.status === 'delivered' ||
          originalValues.status === 'shipped' || originalValues.status === 'delivered') {
        // Include status to ensure backend processes the update
        changes.status = currentValues.status;
        changes.shipping_partner = currentValues.shipping_partner;
        changes.tracking_number = currentValues.tracking_number;
        changes.tracking_url = currentValues.tracking_url;
      }
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
              className="min-w-[180px]"
            />
            {/* Tracking Information - Show when status is "shipped" or "delivered" */}
            {showTrackingFields && (
              <div className="mt-4 p-4 bg-brand-bg/50 rounded-lg border border-white/10 space-y-3">
                <p className="text-sm font-medium text-brand-primary mb-3">Shipping Information</p>
                
                <div>
                  <label className="block text-xs text-brand-secondary mb-1">
                    Shipping Partner
                  </label>
                  <Input
                    type="text"
                    value={currentValues.shipping_partner || ''}
                    onChange={(e) => handleShippingPartnerChange(e.target.value)}
                    placeholder="e.g., FedEx, DHL, BlueDart, Delhivery"
                    className="w-full"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-xs text-brand-secondary mb-1">
                    Tracking Number
                  </label>
                  <Input
                    type="text"
                    value={currentValues.tracking_number || ''}
                    onChange={(e) => handleTrackingNumberChange(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-xs text-brand-secondary mb-1">
                    Tracking URL
                  </label>
                  <Input
                    type="url"
                    value={currentValues.tracking_url || ''}
                    onChange={(e) => handleTrackingUrlChange(e.target.value)}
                    placeholder="https://tracking.example.com/..."
                    className="w-full"
                    disabled={isSaving}
                  />
                </div>

                <p className="text-xs text-brand-secondary mt-2">
                  * At least one field (Shipping Partner, Tracking Number, or Tracking URL) is required when status is "Shipped"
                </p>
              </div>
            )}
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
              className="min-w-[180px]"
            />
            {/* Partner Order ID Input - shown when fulfillment partner is selected */}
            {currentValues.fulfillment_partner && (
              <div className="mt-3">
                <p className="text-sm text-brand-secondary mb-2">
                  {currentValues.fulfillment_partner} Order ID
                </p>
                <Input
                  type="text"
                  value={currentValues.partner_order_id || ''}
                  onChange={(e) => handlePartnerOrderIdChange(e.target.value)}
                  placeholder={`Enter ${currentValues.fulfillment_partner} order ID`}
                  disabled={isSaving}
                  className="w-full"
                />
              </div>
            )}
          </div>
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

