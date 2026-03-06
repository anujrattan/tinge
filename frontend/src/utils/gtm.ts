/**
 * Google Tag Manager and dataLayer helpers.
 * Single interface for the app; all tracking goes through this module.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

let isGtmLoaded = false;
let trackingAllowed = false;

/** Call when user has consented to analytics/marketing; allows pushes to dataLayer. */
export function setTrackingAllowed(allowed: boolean): void {
  trackingAllowed = allowed;
}

/** Initialize GTM: create dataLayer and inject container script. Idempotent. */
export function initGtm(containerId: string): void {
  if (typeof window === 'undefined' || !containerId.trim()) return;
  if (isGtmLoaded) return;

  const id = containerId.trim();
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: 'gtm.js',
    'gtm.start': Date.now(),
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
  document.head.appendChild(script);
  isGtmLoaded = true;
}

/** Push an event to dataLayer. No-ops on server or when tracking not allowed. */
export function pushToDataLayer(event: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!window.dataLayer) return;
  if (!trackingAllowed) return;
  window.dataLayer.push(event);
}

// --- Page view ---

export function trackPageView(payload: { path: string; title?: string }): void {
  pushToDataLayer({
    event: 'page_view',
    page_path: payload.path,
    page_title: payload.title ?? document.title,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
  });
}

// --- Ecommerce payload types (GA4 / Meta friendly) ---

export interface TrackingItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity: number;
  index?: number;
}

/** Build TrackingItem[] from cart-like items for ecommerce events. */
export function cartToTrackingItems(
  items: Array<{
    id: string;
    name?: string;
    title?: string;
    category_name?: string;
    category?: string;
    selling_price?: number;
    price?: number;
    quantity: number;
  }>,
  startIndex = 0
): TrackingItem[] {
  return items.map((item, i) => ({
    item_id: item.id,
    item_name: item.name ?? item.title ?? '',
    item_category: item.category_name ?? item.category,
    price: item.selling_price ?? item.price,
    quantity: item.quantity,
    index: startIndex + i,
  }));
}

export interface ViewContentPayload {
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  currency?: string;
  value?: number;
  items?: TrackingItem[];
}

export function trackViewContent(payload: ViewContentPayload): void {
  pushToDataLayer({
    event: 'view_content',
    ...payload,
  });
}

export interface AddToCartPayload {
  currency?: string;
  value?: number;
  items: TrackingItem[];
}

export function trackAddToCart(payload: AddToCartPayload): void {
  pushToDataLayer({
    event: 'add_to_cart',
    ...payload,
  });
}

export interface InitiateCheckoutPayload {
  currency?: string;
  value?: number;
  items: TrackingItem[];
  coupon?: string;
  checkout_step?: number;
}

export function trackInitiateCheckout(payload: InitiateCheckoutPayload): void {
  pushToDataLayer({
    event: 'initiate_checkout',
    ...payload,
  });
}

export interface PurchasePayload {
  transaction_id?: string;
  order_id?: string;
  currency?: string;
  value?: number;
  items?: TrackingItem[];
}

export function trackPurchase(payload: PurchasePayload): void {
  pushToDataLayer({
    event: 'purchase',
    transaction_id: payload.transaction_id ?? payload.order_id,
    order_id: payload.order_id ?? payload.transaction_id,
    currency: payload.currency,
    value: payload.value,
    items: payload.items,
  });
}

/** SessionStorage key for passing purchase payload to OrderSuccessPage (set in CheckoutPage). */
export const PURCHASE_PAYLOAD_STORAGE_KEY = 'luxe-threads-purchase-payload';
