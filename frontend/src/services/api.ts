import { Product, Category, Collection } from '../types';
import { authService } from './auth.js';
import { getGuestSessionId } from '../utils/guestSession';

// Cast import.meta as any here to avoid typing issues while keeping config simple
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Helper function to make authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = authService.getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // For guest users, send guest session ID
    const guestSessionId = getGuestSessionId();
    if (guestSessionId) {
      headers['X-Guest-Session-Id'] = guestSessionId;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Mock data removed - app now uses only real data from backend API

const api = {
  // Authentication
  signup: async (email: string, password: string, name?: string): Promise<{ token: string; user: any }> => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getCurrentUser: async (): Promise<any> => {
    return apiCall('/auth/me');
  },

  // Products
  getProducts: async (categorySlug?: string): Promise<Product[]> => {
    const endpoint = categorySlug ? `/products?category=${categorySlug}` : '/products';
    return await apiCall(endpoint);
  },

  getProductsByCollection: async (collectionSlug: string): Promise<Product[]> => {
    return await apiCall(`/products?collection=${collectionSlug}`);
  },

  getProductById: async (id: string): Promise<Product | undefined> => {
    return await apiCall(`/products/${id}`);
  },

  getDesignFamilies: async (q?: string, limit: number = 10): Promise<string[]> => {
    const params = new URLSearchParams();
    if (q && q.trim()) params.append('q', q.trim());
    params.append('limit', String(limit));
    const query = params.toString();
    const response = await apiCall(`/products/design-families${query ? `?${query}` : ''}`);
    return Array.isArray(response?.families) ? response.families : [];
  },

  getColorProfiles: async (): Promise<{ name: string; hex: string }[]> => {
    const response = await apiCall('/colors');
    return Array.isArray(response?.profiles) ? response.profiles : [];
  },

  upsertColorProfile: async (name: string, hex: string): Promise<{ name: string; hex: string }> => {
    const response = await apiCall('/colors', {
      method: 'POST',
      body: JSON.stringify({ name, hex }),
    });
    return response?.profile || { name, hex };
  },

  createProduct: async (productData: Omit<Product, 'id'>): Promise<Product> => {
    return apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product | undefined> => {
    return apiCall(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteProduct: async (id: string): Promise<{ success: boolean }> => {
    return apiCall(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Gelato
  getGelatoTemplate: async (templateId: string): Promise<any> => {
    return apiCall(`/gelato/templates/${templateId}`);
  },
  
  // Categories
  getCategories: async (): Promise<Category[]> => {
    return await apiCall('/categories');
  },

  // Get all categories including inactive (admin only)
  getAllCategoriesAdmin: async (): Promise<Category[]> => {
    return apiCall('/categories/admin/all');
  },

  // Toggle category active status (admin only)
  toggleCategoryActive: async (id: string): Promise<Category> => {
    return apiCall(`/categories/${id}/toggle-active`, {
      method: 'PATCH',
    });
  },

  createCategory: async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
    return apiCall('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  updateCategory: async (id: string, updates: Partial<Category>): Promise<Category | undefined> => {
    return apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteCategory: async (id: string): Promise<{ success: boolean }> => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Collections
  getCollections: async (): Promise<Collection[]> => {
    return await apiCall('/collections');
  },

  // Get all collections including inactive (admin only)
  getAllCollectionsAdmin: async (): Promise<Collection[]> => {
    return apiCall('/collections/admin/all');
  },

  // Toggle collection active status (admin only)
  toggleCollectionActive: async (id: string): Promise<Collection> => {
    return apiCall(`/collections/${id}/toggle-active`, {
      method: 'PATCH',
    });
  },

  createCollection: async (
    collectionData: Omit<Collection, 'id' | 'createdAt'> & { imageFile?: string },
  ): Promise<Collection> => {
    return apiCall('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    });
  },

  updateCollection: async (
    id: string,
    updates: Partial<Collection> & { imageFile?: string },
  ): Promise<Collection | undefined> => {
    return apiCall(`/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteCollection: async (id: string): Promise<{ success: boolean }> => {
    return apiCall(`/collections/${id}`, {
      method: 'DELETE',
    });
  },

  submitOrder: async (orderDetails: any, gateway: 'COD' | 'Prepaid' = 'COD'): Promise<{ success: boolean; orderId?: string; orderNumber?: string; message?: string; razorpay?: any }> => {
    try {
      const { customer, items, total, shippingCost: providedShippingCost, codFee: providedCodFee } = orderDetails;
      
      // Use firstName and lastName directly from form (now captured separately)
      const firstName = customer.firstName || customer.first_name || '';
      const lastName = customer.lastName || customer.last_name || '';
      
      // Fallback: if name field exists (for backward compatibility), split it
      const nameParts = (customer.name || '').trim().split(' ');
      const finalFirstName = firstName || nameParts[0] || '';
      const finalLastName = lastName || nameParts.slice(1).join(' ') || '';
      
      // Calculate amounts (all prices are tax-inclusive on the frontend)
      const subtotalFromItems = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      // Allow caller (CheckoutPage) to provide shipping and COD handling fee
      const shippingCost = typeof providedShippingCost === 'number' ? providedShippingCost : 0;
      const codFee = typeof providedCodFee === 'number' ? providedCodFee : 0;
      // Use caller's total when provided (base amount: subtotal or discounted subtotal); API adds shipping + codFee once
      const baseTotal = typeof total === 'number' && total >= 0 ? total : subtotalFromItems;
      const totalAmount = baseTotal + shippingCost + codFee;
      const taxAmount = 0;
      
      // Map cart items to line items format expected by backend
      const lineItems = items.map((item: any) => ({
        productId: item.id,
        size: item.selectedSize,
        color: item.selectedColor,
        quantity: item.quantity,
        price: item.price, // Unit price
      }));
      
      // Prepare order payload
      const orderPayload = {
        userEmail: customer.email,
        userName: `${finalFirstName} ${finalLastName}`.trim(), // Full name for display
        lineItems: lineItems,
        shippingAddress: {
          firstName: finalFirstName,
          lastName: finalLastName,
          email: customer.email,
          phone: customer.phone || '',
          address1: customer.address,
          address2: customer.address2 || '',
          city: customer.city,
          province: customer.state || '',
          zip: customer.zip,
          countryCode: 'IN', // Default to India
        },
        subtotal: subtotalFromItems,
        taxAmount: taxAmount,
        shippingCost: shippingCost,
        codFee: codFee,
        totalAmount: totalAmount,
        gateway: gateway,
      };
      
      const response = await apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });
      
      return {
        success: true,
        orderId: response.order?.id,
        orderNumber: response.order?.order_number,
        message: response.message || 'Order placed successfully',
        razorpay: response.razorpay || null,
      };
    } catch (error: any) {
      console.error('Error submitting order:', error);
      return {
        success: false,
        message: error.message || 'Failed to place order. Please try again.',
      };
    }
  },

  getBestSellers: async (limit?: number): Promise<Product[]> => {
    const queryParams = limit ? `?limit=${limit}` : '';
    return await apiCall(`/products/best-sellers${queryParams}`);
  },

  getNewArrivals: async (limit?: number): Promise<Product[]> => {
    const queryParams = limit ? `?limit=${limit}` : '';
    return await apiCall(`/products/new-arrivals${queryParams}`);
  },

      getSaleItems: async (): Promise<Product[]> => {
        return await apiCall('/products/sale');
      },
      // Orders
      getOrders: async (status?: string, limit?: number, offset?: number): Promise<{ success: boolean; orders: any[]; total: number }> => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (limit) params.append('limit', limit.toString());
        if (offset) params.append('offset', offset.toString());
        const queryString = params.toString();
        return apiCall(`/orders${queryString ? `?${queryString}` : ''}`);
      },

      getOrderByNumber: async (orderNumber: string, email?: string): Promise<any> => {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        const queryString = params.toString();
        return apiCall(`/orders/${orderNumber}${queryString ? `?${queryString}` : ''}`);
      },

      // Download invoice PDF (handles auth headers and blob download)
      downloadInvoice: async (orderNumber: string, email?: string): Promise<void> => {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        const queryString = params.toString();
        const url = `${API_BASE_URL}/orders/${encodeURIComponent(orderNumber)}/invoice${queryString ? `?${queryString}` : ''}`;

        const token = authService.getToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          // Try to read JSON error if provided
          const maybeJson = await response.json().catch(() => null);
          const message =
            (maybeJson && (maybeJson.message || maybeJson.error)) ||
            `Failed to download invoice (status ${response.status})`;
          throw new Error(message);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Invoice-${orderNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      },

      lookupOrder: async (orderNumber: string, email: string): Promise<any> => {
        return apiCall('/orders/lookup', {
          method: 'POST',
          body: JSON.stringify({ orderNumber, email }),
        });
      },

      updateOrderStatus: async (
        orderNumber: string, 
        status: string, 
        notes?: string,
        trackingInfo?: {
          shipping_partner?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
        }
      ): Promise<any> => {
        return apiCall(`/orders/${orderNumber}/status`, {
          method: 'PUT',
          body: JSON.stringify({ 
            status, 
            notes,
            ...(trackingInfo && {
              shipping_partner: trackingInfo.shipping_partner,
              tracking_number: trackingInfo.tracking_number,
              tracking_url: trackingInfo.tracking_url,
            }),
          }),
        });
      },

      updateOrderFulfillmentPartner: async (orderNumber: string, fulfillment_partner: string | null): Promise<any> => {
        return apiCall(`/orders/${orderNumber}/fulfillment-partner`, {
          method: 'PUT',
          body: JSON.stringify({ fulfillment_partner }),
        });
      },

      updateOrderPartnerOrderId: async (orderNumber: string, partner_order_id: string | null): Promise<any> => {
        return apiCall(`/orders/${orderNumber}/partner-order-id`, {
          method: 'PUT',
          body: JSON.stringify({ partner_order_id }),
        });
      },

      // Users
      getUserProfile: async (): Promise<any> => {
        return apiCall('/users/profile');
      },

      getUserOrders: async (): Promise<any> => {
        return apiCall('/users/orders');
      },

      createAddress: async (addressData: any): Promise<any> => {
        return apiCall('/users/addresses', {
          method: 'POST',
          body: JSON.stringify(addressData),
        });
      },

      updateAddress: async (addressId: string, addressData: any): Promise<any> => {
        return apiCall(`/users/addresses/${addressId}`, {
          method: 'PUT',
          body: JSON.stringify(addressData),
        });
      },

      deleteAddress: async (addressId: string): Promise<any> => {
        return apiCall(`/users/addresses/${addressId}`, {
          method: 'DELETE',
        });
      },

      setPrimaryAddress: async (addressId: string): Promise<any> => {
        return apiCall(`/users/addresses/${addressId}/set-primary`, {
          method: 'PUT',
        });
      },

      // Wishlist
      getWishlist: async (): Promise<any> => {
        return apiCall('/wishlists');
      },

      addToWishlist: async (productId: string): Promise<any> => {
        return apiCall('/wishlists', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        });
      },

      removeFromWishlist: async (productId: string): Promise<any> => {
        return apiCall(`/wishlists/${productId}`, {
          method: 'DELETE',
        });
      },

      bulkAddToWishlist: async (productIds: string[]): Promise<any> => {
        return apiCall('/wishlists/bulk', {
          method: 'POST',
          body: JSON.stringify({ product_ids: productIds }),
        });
      },

      clearWishlist: async (): Promise<any> => {
        return apiCall('/wishlists', {
          method: 'DELETE',
        });
      },

      // Blog
      getBlogPosts: async (limit?: number, offset?: number): Promise<any> => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (offset) params.append('offset', String(offset));
        const queryString = params.toString();
        return apiCall(`/blog${queryString ? `?${queryString}` : ''}`);
      },

      getBlogPostBySlug: async (slug: string): Promise<any> => {
        return apiCall(`/blog/${slug}`);
      },

      // Blog (admin)
      getBlogPostsAdmin: async (): Promise<any> => {
        return apiCall('/blog/admin/all');
      },

      createBlogPost: async (payload: any): Promise<any> => {
        return apiCall('/blog', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },

      updateBlogPost: async (id: string, payload: any): Promise<any> => {
        return apiCall(`/blog/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      },

      toggleBlogPostPublish: async (id: string): Promise<any> => {
        return apiCall(`/blog/${id}/toggle-publish`, {
          method: 'PATCH',
        });
      },

      // FAQs (dynamic, with static fallback in UI)
      getFaqs: async (): Promise<any> => {
        return apiCall('/faqs');
      },

      // FAQs (admin)
      getFaqsAdmin: async (): Promise<any> => {
        return apiCall('/faqs/admin/all');
      },

      createFaqItem: async (payload: any): Promise<any> => {
        return apiCall('/faqs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },

      updateFaqItem: async (id: string, payload: any): Promise<any> => {
        return apiCall(`/faqs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      },

      toggleFaqPublish: async (id: string): Promise<any> => {
        return apiCall(`/faqs/${id}/toggle-publish`, {
          method: 'PATCH',
        });
      },

      // Ratings
      submitRating: async (ratingData: { product_id: string; order_id: string; rating: number; email?: string }): Promise<any> => {
        return apiCall('/ratings', {
          method: 'POST',
          body: JSON.stringify(ratingData),
        });
      },

      getProductRatings: async (productId: string): Promise<any> => {
        return apiCall(`/ratings/product/${productId}`);
      },

      getOrderRatings: async (orderNumber: string, email?: string): Promise<any> => {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        const queryString = params.toString();
        return apiCall(`/ratings/order/${orderNumber}${queryString ? `?${queryString}` : ''}`);
      },

      canRateProduct: async (productId: string, orderNumber: string, email?: string): Promise<any> => {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        const queryString = params.toString();
        return apiCall(`/ratings/can-rate/${productId}/${orderNumber}${queryString ? `?${queryString}` : ''}`);
      },

      // Analytics (admin)
      getAnalyticsOverview: async (params: { from?: string; to?: string; granularity?: 'day' | 'week' | 'month' } = {}): Promise<any> => {
        const search = new URLSearchParams();
        if (params.from) search.append('from', params.from);
        if (params.to) search.append('to', params.to);
        if (params.granularity) search.append('granularity', params.granularity);
        const queryString = search.toString();
        return apiCall(`/analytics/overview${queryString ? `?${queryString}` : ''}`);
      },

      // Payments
      createRazorpayOrder: async (orderId: string, orderNumber: string, amount: number): Promise<any> => {
        return apiCall('/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({ orderId, orderNumber, amount }),
        });
      },

      verifyPayment: async (orderId: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<any> => {
        return apiCall('/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            orderId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          }),
        });
      },

  // Search products
  searchProducts: async (params: {
    q: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ results: Product[]; total: number; query: string; page: number; limit: number }> => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    return await apiCall(`/products/search?${queryString}`);
  },
};

export default api;

