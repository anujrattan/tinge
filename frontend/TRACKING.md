# Tracking (GTM, GA4, Meta Pixel)

This app uses **Google Tag Manager (GTM)** as the single integration point. All analytics and ads events are pushed to `window.dataLayer`; GTM fans them out to GA4, Meta Pixel, and other tools.

## Configuration

Tracking IDs are read from Vite environment variables so you can plug or change them per environment without code changes.

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GTM_CONTAINER_ID` | GTM container ID (e.g. `GTM-XXXXXXX`) | Yes, for tracking to run |
| `VITE_GA4_MEASUREMENT_ID` | GA4 measurement ID (e.g. `G-XXXXXXXX`) | No, often set inside GTM |
| `VITE_META_PIXEL_ID` | Meta Pixel ID | No, often set inside GTM |

- Copy [frontend/.env.example](.env.example) to `.env.local` and fill in your GTM container ID.
- GTM is only loaded when the user has accepted **analytics** or **marketing** cookies (see [Cookie consent](#cookie-consent)).

Config is read in [frontend/src/config/tracking.ts](src/config/tracking.ts).

## Events implemented

| Event | When | Where |
|-------|------|--------|
| `page_view` | Every route change (SPA) | [App.tsx](src/App.tsx) (AppLayout) |
| `view_content` | Product detail page viewed | [ProductDetailPage.tsx](src/pages/ProductDetailPage.tsx) |
| `add_to_cart` | Item added to cart | [AppContext.tsx](src/context/AppContext.tsx) (`addToCart`) |
| `initiate_checkout` | Checkout page with non‑empty cart (once per visit) | [CheckoutPage.tsx](src/pages/CheckoutPage.tsx) |
| `purchase` | Order success (COD or Prepaid paid) | [OrderSuccessPage.tsx](src/pages/OrderSuccessPage.tsx) |

Payloads use GA4/Meta‑friendly fields (`currency`, `value`, `items` with `item_id`, `item_name`, `item_category`, `price`, `quantity`).

## Extending tracking

1. **New events**  
   Add a helper in [frontend/src/utils/gtm.ts](src/utils/gtm.ts) (e.g. `trackSearch`, `trackViewItemList`) that calls `pushToDataLayer({ event: '...', ...payload })`.

2. **New tools (e.g. Hotjar, LinkedIn)**  
   Configure them inside GTM using the same dataLayer events; no app code changes needed.

3. **Consent**  
   GTM is initialized only when the user allows analytics or marketing cookies. The `consent_update` event is pushed when consent changes so GTM can adjust tag firing.

## Cookie consent

- **Categories**: `essential`, `analytics`, `marketing`, `functional` (see [frontend/src/utils/cookieConsent.ts](src/utils/cookieConsent.ts)).
- GTM (and thus GA4/Meta tags loaded via GTM) is enabled when **analytics** or **marketing** is allowed.
- [AnalyticsProvider](src/context/AnalyticsProvider.tsx) calls `initGtm()` and `setTrackingAllowed(true)` when consent is granted; it sits inside `CookieConsentProvider` in [App.tsx](src/App.tsx).

## GTM setup (manual)

After the app is deployed with a valid `VITE_GTM_CONTAINER_ID`:

1. Create a GTM Web container and note the container ID.
2. In GTM, add **Variables** that read dataLayer fields (`page_path`, `page_title`, `currency`, `value`, `items`, etc.).
3. **GA4**: Add a GA4 Configuration tag (measurement ID) and GA4 Event tags for `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, triggered by the corresponding dataLayer events.
4. **Meta Pixel**: Add the Meta Pixel base tag and event tags for `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, with triggers tied to the same dataLayer events.
5. Use **Preview/Debug** in GTM to confirm events and parameters, then publish.
