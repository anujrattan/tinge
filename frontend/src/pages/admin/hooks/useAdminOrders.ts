import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

export const useAdminOrders = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderProducts, setOrderProducts] = useState<Record<string, any>>({});
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await api.getOrders();
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch product images when an order is selected
  useEffect(() => {
    if (selectedOrder?.items) {
      const fetchProductImages = async () => {
        try {
          const productIds = [...new Set(selectedOrder.items.map((item: any) => item.product_id).filter(Boolean))];
          const productPromises = productIds.map((id: string) => api.getProductById(id));
          const productResults = await Promise.all(productPromises);
          
          const productsMap: Record<string, any> = {};
          productResults.forEach((product) => {
            if (product) {
              productsMap[product.id] = product;
            }
          });
          setOrderProducts(productsMap);
        } catch (error) {
          console.error('Failed to fetch product images:', error);
        }
      };
      fetchProductImages();
    } else {
      setOrderProducts({});
    }
  }, [selectedOrder]);


  const selectOrder = (order: any) => {
    setSelectedOrder(order);
  };

  const clearSelection = () => {
    setSelectedOrder(null);
  };

  /**
   * Save all order changes in grouped updates
   * Group 1: Status + Tracking Info (shipped together)
   * Group 2: Fulfillment Partner + Partner Order ID (shipped together)
   */
  const saveOrderChanges = async (
    orderNumber: string,
    changes: {
      // Group 1: Status & Tracking
      status?: string;
      shipping_partner?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
      // Group 2: Fulfillment Partner & Partner Order ID
      fulfillment_partner?: string | null;
      partner_order_id?: string | null;
    }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      setIsSaving(true);
      const updates: Promise<any>[] = [];
      const errors: string[] = [];

      // Group 1: Update Status + Tracking Info (if status changed or tracking info changed)
      const statusChanged = changes.status !== undefined && 
        changes.status !== selectedOrder?.status;
      const trackingChanged = 
        changes.shipping_partner !== undefined ||
        changes.tracking_number !== undefined ||
        changes.tracking_url !== undefined;

      if (statusChanged || trackingChanged) {
        const newStatus = changes.status !== undefined 
          ? changes.status 
          : selectedOrder?.status || 'pending';
        
        // Validate: If status is "shipped", require at least one tracking field
        if (newStatus === 'shipped') {
          // Get final tracking values (new or existing)
          const finalShippingPartner = changes.shipping_partner !== undefined 
            ? changes.shipping_partner 
            : selectedOrder?.shipping_partner || null;
          const finalTrackingNumber = changes.tracking_number !== undefined 
            ? changes.tracking_number 
            : selectedOrder?.tracking_number || null;
          const finalTrackingUrl = changes.tracking_url !== undefined 
            ? changes.tracking_url 
            : selectedOrder?.tracking_url || null;

          const hasTrackingInfo = 
            finalShippingPartner ||
            finalTrackingNumber ||
            finalTrackingUrl;

          if (!hasTrackingInfo) {
            return {
              success: false,
              message: 'At least one tracking field (Shipping Partner, Tracking Number, or Tracking URL) is required when status is "shipped"',
            };
          }

          // Prepare tracking info for "shipped" status
          const trackingInfo = {
            shipping_partner: finalShippingPartner,
            tracking_number: finalTrackingNumber,
            tracking_url: finalTrackingUrl,
          };

          updates.push(
            api.updateOrderStatus(orderNumber, newStatus, undefined, trackingInfo)
              .catch((error: any) => {
                errors.push(`Failed to update status: ${error.message || 'Unknown error'}`);
                throw error;
              })
          );
        } else {
          // Status changed but not to "shipped" - just update status
          if (statusChanged) {
            updates.push(
              api.updateOrderStatus(orderNumber, newStatus, undefined, undefined)
                .catch((error: any) => {
                  errors.push(`Failed to update status: ${error.message || 'Unknown error'}`);
                  throw error;
                })
            );
          }
        }
      }

      // Group 2: Update Fulfillment Partner + Partner Order ID (if either changed)
      const fulfillmentPartnerChanged = changes.fulfillment_partner !== undefined &&
        changes.fulfillment_partner !== selectedOrder?.fulfillment_partner;
      const partnerOrderIdChanged = changes.partner_order_id !== undefined &&
        changes.partner_order_id !== selectedOrder?.partner_order_id;

      if (fulfillmentPartnerChanged || partnerOrderIdChanged) {
        // Update fulfillment partner if changed
        if (fulfillmentPartnerChanged) {
          updates.push(
            api.updateOrderFulfillmentPartner(orderNumber, changes.fulfillment_partner || null)
              .catch((error: any) => {
                errors.push(`Failed to update fulfillment partner: ${error.message || 'Unknown error'}`);
                throw error;
              })
          );
        }

        // Update partner order ID if changed
        if (partnerOrderIdChanged) {
          updates.push(
            api.updateOrderPartnerOrderId(orderNumber, changes.partner_order_id || null)
              .catch((error: any) => {
                errors.push(`Failed to update partner order ID: ${error.message || 'Unknown error'}`);
                throw error;
              })
          );
        }
      }

      // Execute all updates
      if (updates.length > 0) {
        const results = await Promise.allSettled(updates);
        
        // Check if any failed
        const failed = results.some(result => result.status === 'rejected');
        
        if (failed) {
          const errorMessages = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map(r => r.reason?.message || 'Unknown error');
          
          return {
            success: false,
            message: `Some updates failed: ${errorMessages.join(', ')}`,
          };
        }

        // All updates succeeded - refresh orders and update selected order
        await fetchOrders();
        
        // Update selected order with new values
        if (selectedOrder && selectedOrder.order_number === orderNumber) {
          setSelectedOrder({
            ...selectedOrder,
            ...(changes.status !== undefined && { status: changes.status }),
            ...(changes.shipping_partner !== undefined && { shipping_partner: changes.shipping_partner }),
            ...(changes.tracking_number !== undefined && { tracking_number: changes.tracking_number }),
            ...(changes.tracking_url !== undefined && { tracking_url: changes.tracking_url }),
            ...(changes.fulfillment_partner !== undefined && { fulfillment_partner: changes.fulfillment_partner }),
            ...(changes.partner_order_id !== undefined && { partner_order_id: changes.partner_order_id }),
          });
        }

        showToast('Order updated successfully', 'success');
        return { success: true };
      } else {
        // No changes to save
        return { success: false, message: 'No changes to save' };
      }
    } catch (error: any) {
      console.error('Error saving order changes:', error);
      showToast(error.message || 'Failed to save order changes', 'error');
      return { success: false, message: error.message || 'Failed to save order changes' };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    orders,
    selectedOrder,
    orderProducts,
    ordersLoading,
    isSaving,
    fetchOrders,
    selectOrder,
    clearSelection,
    saveOrderChanges,
  };
};

