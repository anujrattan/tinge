# Luxe Threads — Implementation Notes

**Purpose:** Living documentation for engineers and AI assistants. Describes what is implemented in this repo, how it behaves, which files to touch, and which database migrations must be applied. Read this before changing admin product flows, categories, pricing, or storefront cart/checkout behavior.

**Last updated:** June 2026 (metal posters, color typeahead, per-size pricing, category `product_type`).

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Database migrations (required)](#2-database-migrations-required)
3. [Product types & categories](#3-product-types--categories)
4. [Metal posters (admin + data model)](#4-metal-posters-admin--data-model)
5. [Per-size pricing (`variants.size_prices`)](#5-per-size-pricing-variantssize_prices)
6. [Color profiles & admin typeahead](#6-color-profiles--admin-typeahead)
7. [Cart upsells (`complement_slugs`)](#7-cart-upsells-complement_slugs)
8. [Backend API changes](#8-backend-api-changes)
9. [Frontend architecture map](#9-frontend-architecture-map)
10. [Storefront behavior matrix](#10-storefront-behavior-matrix)
11. [Pricing validation & orders](#11-pricing-validation--orders)
12. [Printrove vs Qikink](#12-printrove-vs-qikink)
13. [Extending the system (totes, new types)](#13-extending-the-system-totes-new-types)
14. [Testing checklist](#14-testing-checklist)
15. [Known limitations & intentional non-goals](#15-known-limitations--intentional-non-goals)

---

## 1. Executive summary

| Feature | Status | Driver |
|--------|--------|--------|
| **Category `product_type`** | `apparel` \| `poster` on `categories` | Switches admin product form and storefront rules |
| **Metal posters** | One listing, two fixed sizes, no color, Qikink fulfillment | `product_type = poster` |
| **Per-size selling prices** | Optional `variants.size_prices` JSON map | Posters (and future types in `SIZE_PRICING_PRODUCT_TYPES`) |
| **Color typeahead** | Admin **Add Product** only, from `color_profiles` | Apparel listings |
| **`complement_slugs`** | Cart cross-sell category slugs | Category create/update API |
| **Apparel unchanged** | Single `selling_price`, S–3XL sizes, color per listing | Default `product_type` |

**Design principle:** Reuse the single `products` table and `variants` JSONB column. Do **not** reintroduce the dropped `product_variants` table for storefront variants.

---

## 2. Database migrations (required)

Apply on **Supabase** (SQL Editor) in order. Files live under `backend/db-migrations/`.

| Migration | File | What it does |
|-----------|------|----------------|
| Color profiles table | `024_create_color_profiles_table.sql` | `color_profiles(name, hex)` with uniqueness constraints |
| Color seed (optional) | `026_seed_oversized_tee_color_profiles.sql` | Seeds common tee colors |
| Category product type | `027_add_product_type_to_categories.sql` | `categories.product_type` (`apparel` \| `poster`), seeds/updates `metal-posters` |
| Complement slugs | `028_add_complement_slugs_to_categories.sql` | `categories.complement_slugs text[]` — **required for category create** |

**No migration for `size_prices`:** prices are stored inside existing `products.variants` JSONB.

### 027 — Metal Posters category seed

- Inserts category `Metal Posters` / slug `metal-posters` if missing.
- Sets `product_type = 'poster'` for slug `metal-posters`.
- Replace placeholder `image_url` in admin after migrate if needed.

### 028 — Common error if skipped

Creating a category without this migration fails with:

> Could not find the 'complement_slugs' column of 'categories' in the schema cache

**Fix:** Run `028_add_complement_slugs_to_categories.sql`.

### Color data import

- CSV: `docs/color_profiles_import.csv` (30 colors; `Red` = `#CE051F`).
- Audit notes: `docs/color-profiles-audit.md`.
- Admin typeahead calls `GET /api/colors` with `{ refresh: true }` to bypass Redis after imports.

---

## 3. Product types & categories

### Schema

```sql
categories.product_type TEXT NOT NULL DEFAULT 'apparel'
  CHECK (product_type IN ('apparel', 'poster'));
```

### TypeScript

- `ProductType = 'apparel' | 'poster'` — `frontend/src/types/index.ts`
- `Category.product_type?: ProductType`
- `Product.category_product_type?: ProductType` — joined from category on product API responses (not stored on `products` row)

### Admin — categories

- **File:** `frontend/src/pages/admin/components/CategoryForm.tsx`
- Dropdown: Apparel vs Metal poster (`PRODUCT_TYPE_OPTIONS` in `productTypeConfig.ts`).
- Sends `product_type` and `complementSlugs` on create/update.

### Admin — products

- **File:** `frontend/src/pages/admin/components/ProductForm.tsx`
- Top **Product type** dropdown filters categories to matching `product_type`.
- Switching to **Metal poster** runs `applyProductTypeSwitch('poster')`:
  - Sets poster sizes, clears color / design family / size chart.
  - Default fulfillment `Qikink`.
  - Auto-selects first `product_type === 'poster'` category if current category is apparel.
- **Printrove prefill cleared** when switching to poster (`AdminPage` → `onProductTypeChange`).

### Backend — categories API

- **File:** `backend/src/routes/categories.ts`
- `transformCategory` exposes `product_type` and `complementSlugs`.
- Create/update persist `product_type` and `complement_slugs`.

### Backend — products API

- All main product selects join `categories:category_id` including **`product_type`**.
- `transformProduct` sets `category_product_type: 'poster' | 'apparel'`.

---

## 4. Metal posters (admin + data model)

### Fixed sizes (canonical keys)

| DB / API key | Display label |
|--------------|---------------|
| `8x11.7in` | 8 × 11.7 in |
| `11.7x15.7in` | 11.7 × 15.7 in |

- Constants: `POSTER_SIZES` in `frontend/src/utils/sizeSystem.ts` and `backend/src/utils/sizeNormalization.ts`.
- Normalization: `normalizePosterSizeList`, `formatPosterSizeLabel`, `hasAllPosterSizes` / `posterSizesComplete`.

### Product row shape (poster)

| Field | Poster value |
|-------|----------------|
| `color` | `null` |
| `variants.sizes` | Both poster sizes when **published** (draft may omit one) |
| `size_chart_profile` | `null` |
| `design_family` | `null` |
| `fulfillment_partner` | Typically `Qikink` (default in config) |
| `partner_variants` | Per-size SKU + variant ID (see admin table) |

### Admin UI — poster-only component

- **File:** `frontend/src/pages/admin/components/product-form/PosterProductFields.tsx`
- **Sizes on listing:** Checkbox-style cards (included / not included). Not “pick one size for the SKU.”
- **Publishing:** Requires both sizes included (`posterSizesComplete`).
- **Table:** Size | **Price (₹)** | SKU | Variant ID (Qikink mapping).
- Hidden for posters in `ProductForm`: apparel sizes grid, color field, design family, size chart, apparel fulfillment/Printrove variant blocks.

### Storefront detection

- `isPosterProduct(product)` → `product.category_product_type === 'poster'`.
- Used on PDP, cart line display, checkout validation.

---

## 5. Per-size pricing (`variants.size_prices`)

### JSON shape (in `products.variants`)

```json
{
  "sizes": ["8x11.7in", "11.7x15.7in"],
  "size_prices": {
    "8x11.7in": 899,
    "11.7x15.7in": 1299
  }
}
```

| Rule | Behavior |
|------|----------|
| Apparel without `size_prices` | Unchanged: one `selling_price` for all sizes |
| With `size_prices` | Checkout/cart use price for **selected size** |
| `selling_price` column | **Listing minimum** among size prices (also used for sort/filters and discount math baseline when validating) |
| Discounts | Product-level `%` and sale still apply to the **resolved** size price |
| Display anchoring | `toAnchoredDisplayPrice` / `getDisplayPrice` — same as apparel |

### Which product types use size pricing

- **Config:** `SIZE_PRICING_PRODUCT_TYPES = ['poster']` in `frontend/src/pages/admin/productTypeConfig.ts`.
- **Helper:** `usesSizePricing(productType)`.
- **Future totes:** Add `'tote'` to that array when `ProductType` and category type exist.

### Shared utilities

| Layer | File | Key exports |
|-------|------|-------------|
| Frontend | `frontend/src/utils/sizePricing.ts` | `getSellingPriceForSize`, `getListingSellingPrice`, `hasVariableSizePricing`, `buildSizePricesPayload`, `minPriceForSizes`, `parseSizePricesMap` |
| Backend | `backend/src/utils/variantPricing.ts` | `extractVariantsFromDb`, `buildVariantsPayload`, `parseSizePricesMap`, `resolveListingSellingPrice` |

Size keys are normalized via `normalizeSizeLabel` (handles poster keys and apparel S/M/L aliases).

### Admin — saving posters with prices

1. Enter **Price (₹)** per included size in `PosterProductFields`.
2. **List price (from)** field is read-only; auto-set to lowest size price.
3. On publish, validation requires price &gt; 0 for each included size.
4. Payload includes `size_prices` + `selling_price` (min) + `sizes`.

### Storefront

| Surface | Behavior |
|---------|----------|
| **Product cards** | `getListingSellingPrice` + **“From”** prefix when `hasVariableSizePricing` (two different positive prices) |
| **PDP** | Price recalculates when customer selects size; subtitle: “Price for {size} · inclusive of all taxes” |
| **Add to cart** | Spreads product with `selling_price: getSellingPriceForSize(product, selectedSize)` |
| **Cart** | Line price already anchored at add time in `AppContext.addToCart` |

### Backend — create/update

- **File:** `backend/src/routes/products.ts`
- Accepts `size_prices` in body with `sizes`.
- Builds `variants` via `buildVariantsPayload`.
- Sets `selling_price` via `resolveListingSellingPrice` (min of size prices when present).
- Pricing validation snapshot uses listing (min) price so frontend/backend agree.

---

## 6. Color profiles & admin typeahead

### Table

`color_profiles(name UNIQUE, hex UNIQUE)` — see migration `024`.

### Admin typeahead rules

- **Enabled when:** `isAdmin && !product?.id` (new listing only, not edit).
- **File:** `ProductForm.tsx` — dropdown with swatch, name, hex; filters by typed query.
- **Load:** `api.getColorProfiles({ refresh: true })` on mount; also `setDynamicColorProfiles` for `getColorName()` sitewide.

### New hex on submit

- If color is `#RRGGBB` and not in palette → prompt for **custom color name** → `api.upsertColorProfile` before product save.

### Apparel color field

- Still a single `products.color` string (name or hex) per listing.
- Posters force `color: null` on save.

---

## 7. Cart upsells (`complement_slugs`)

### Schema

```sql
categories.complement_slugs text[] NOT NULL DEFAULT '{}'
```

### Usage

- **Admin:** `CategoryForm` — tag input for slugs (cross-sell when this category is in cart).
- **Storefront:** `CartPage` loads categories, builds map via `frontend/src/utils/recommendationCategories.ts`, falls back to static map if DB empty.
- **API:** `categories` routes read/write `complement_slugs` ↔ `complementSlugs` in JSON.

---

## 8. Backend API changes

### Products (`backend/src/routes/products.ts`)

| Concern | Detail |
|---------|--------|
| Category join | `product_type` on nested `categories` in selects |
| Response `variants` | `{ sizes, size_prices? }` via `extractVariantsFromDb` |
| Create body | `sizes`, optional `size_prices`, standard pricing fields |
| Update body | Same; merges `variants` when sizes provided |
| `category_product_type` | Computed in `transformProduct` |

### Categories (`backend/src/routes/categories.ts`)

| Field | Create/Update |
|-------|----------------|
| `product_type` | `apparel` or `poster` |
| `complementSlugs` | string array → `complement_slugs` |

### Colors (`backend/src/routes/colors.ts`)

- List profiles (Redis cache; `?refresh=true` for admin).
- Upsert profile (admin).

---

## 9. Frontend architecture map

```
frontend/src/
├── types/index.ts                    # ProductType, variants.size_prices, category_product_type
├── utils/
│   ├── sizeSystem.ts               # POSTER_SIZES, isPosterProduct, size charts
│   ├── sizePricing.ts              # Per-size price resolution (storefront + admin helpers)
│   ├── pricing.ts                  # Discounts, display anchoring, validation payload
│   ├── colorUtils.ts               # Dynamic palette from color_profiles
│   └── recommendationCategories.ts # complement_slugs + fallback map
├── pages/
│   ├── admin/
│   │   ├── productTypeConfig.ts    # Types, poster labels, SIZE_PRICING_PRODUCT_TYPES
│   │   └── components/
│   │       ├── ProductForm.tsx     # Shell: type switch, apparel vs poster, submit
│   │       ├── product-form/
│   │       │   └── PosterProductFields.tsx
│   │       └── CategoryForm.tsx
│   ├── ProductDetailPage.tsx       # Size-based price, poster UX
│   ├── CartPage.tsx                # Poster line text; upsells
│   ├── CheckoutPage.tsx            # Skip color validation for posters
│   └── AdminPage.tsx               # Printrove prefill guard for poster type
└── components/
    └── ProductCard.tsx             # "From" + listing price
```

```
backend/src/
├── routes/
│   ├── products.ts                 # variants + size_prices + category_product_type
│   └── categories.ts               # product_type, complement_slugs
└── utils/
    ├── sizeNormalization.ts        # Poster + apparel size canonicalization
    └── variantPricing.ts           # variants JSON helpers
```

---

## 10. Storefront behavior matrix

| Scenario | Size UI | Color | Price shown | Cart line | Checkout |
|----------|---------|-------|-------------|-----------|----------|
| Apparel tee | S–3XL grid | Required (config) | Single `selling_price` | `Color / Size` | Color required |
| Metal poster | Two poster sizes | Hidden | Per selected size (or min before select) | `Size: {size}` only | Color not required |
| Poster + variable `size_prices` | Same | Hidden | Updates on size change; cards show **From** | Anchored at add | Uses cart `price` |

**Cart identity key:** `productId + selectedColor + selectedSize` (same poster in two sizes = two lines).

---

## 11. Pricing validation & orders

- Admin publish sends `pricing_validation` snapshot (`createPricingValidationPayload`).
- Backend recomputes with `createPricingValidationSnapshot`; must match within tolerance (`pricingPayloadMatches`).
- For size-priced products, validation uses **listing (minimum) selling price**, not each size individually.
- **Orders:** `order_items.unit_price` comes from cart item `price` at checkout (already size-resolved if customer picked size before add).

---

## 12. Printrove vs Qikink

| Product type | Typical fulfillment | Admin sync |
|--------------|----------------------|------------|
| Apparel | Printrove | **Sync from Printrove** on products list; prefill into `ProductForm` |
| Metal poster | Qikink | Manual `partner_product_id` + per-size table in `PosterProductFields` |

- Switching product type to **poster** clears Printrove prefill (`AdminPage` + `onProductTypeChange`).
- Do not use Printrove sync to create poster listings.

---

## 13. Extending the system (totes, new types)

### Add a new product type (e.g. tote)

1. **DB:** Extend `categories_product_type_check` to include new value (new migration).
2. **Types:** Extend `ProductType` in `frontend/src/types/index.ts`.
3. **Config:** Add to `PRODUCT_TYPE_OPTIONS`, `DEFAULT_FULFILLMENT_BY_TYPE`, and optionally `SIZE_PRICING_PRODUCT_TYPES` if prices vary by size.
4. **Admin:** Either extend `PosterProductFields` pattern (fixed sizes + price column) or add `ToteProductFields.tsx` and branch in `ProductForm`.
5. **Storefront:** Extend `isPosterProduct` pattern → e.g. `getProductTypeBehavior(product)` or category flag.
6. **Backend:** `transformProduct` / category join already pass `product_type`; map to `category_product_type`.

### Per-size pricing without new tables

- Only add product type to `SIZE_PRICING_PRODUCT_TYPES` and admin UI to edit `variants.size_prices`.
- Reuse `sizePricing.ts` / `variantPricing.ts` unchanged.

---

## 14. Testing checklist

### Migrations

- [ ] `024`, `027`, `028` applied on Supabase
- [ ] `color_profiles` populated (CSV or seed)
- [ ] Category **Metal Posters** exists with `product_type = poster`

### Admin — apparel

- [ ] Add product: color typeahead suggests palette
- [ ] Edit product: no typeahead (plain input)
- [ ] New hex + name saves to `color_profiles`

### Admin — poster

- [ ] Product type → Metal poster; categories filtered
- [ ] Both sizes included; per-size prices filled
- [ ] Publish succeeds; `variants.size_prices` in DB
- [ ] List price (from) equals min size price

### Storefront

- [ ] Poster PDP: size change updates price
- [ ] Add to cart: correct total for each size
- [ ] Checkout without color error
- [ ] Product grid shows **From** when prices differ

### Categories

- [ ] Create category with Metal poster type (no `complement_slugs` error)

---

## 15. Known limitations & intentional non-goals

| Topic | Notes |
|-------|--------|
| **Per-size discounts** | Not implemented; discounts are product-level only |
| **Per-size vendor cost** | Single `vendor_base_cost` on product; margin helper uses listing price |
| **Edit-mode color typeahead** | Disabled intentionally (add-only) |
| **Separate SKU per poster size as separate products** | Avoided; one listing, two sizes |
| **`product_variants` table** | Removed (migration `007`); do not rebuild for these features |
| **Category without migration 028** | Category create fails until `complement_slugs` exists |
| **ProductForm full split** | Logic is `ProductForm` + `PosterProductFields`; not fully split into Shared/Apparel files |
| **Tote bags** | Planned to reuse `size_prices`; type not added yet |

---

## Quick reference — API body fields (admin product save)

```typescript
{
  title, description, category_id,
  selling_price,        // min size price when size_prices used
  sizes: string[],
  size_prices?: Record<string, number>,  // optional
  color: string | null,
  partner_variants: Array<{ size, partner_sku, partner_variant_id }>,
  fulfillment_partner, partner_product_id,
  pricing_validation,   // required when publishing (non-draft)
  // ... images, discounts, vendor costs, etc.
}
```

---

## Related docs in repo

| Document | Topic |
|----------|--------|
| `docs/color-profiles-audit.md` | Palette import & hex audit |
| `docs/color_profiles_import.csv` | Import data |
| `backend/db-migrations/README.md` | Migration run order (legacy list; see §2 above for new ones) |

---

*When you change behavior in this area, update this file in the same PR so AI assistants and future contributors stay aligned.*
