# One Listing Per Color – Change Identification

**Current model:** One product = one “base product” with multiple color variants. One PDP with color + size selectors; mockup images keyed by color.

**New model:** One product = one listing = one color. “Premium Tee” in 4 colors = 4 separate products. Each has its own main image and one set of mockup images. PDP has only a size selector.

---

## 1. Add Listing Logic (Admin ProductForm) – REMOVE

| Area | What to remove |
|------|----------------|
| **Multi-color input** | The “add multiple colors” flow: input + Add button, list of color pills with remove, validation “at least one color”. Replace with a **single color** field (one value per listing). |
| **Mockup-by-color UX** | “Select a color” dropdown and “Upload mockup images for [Color]” section keyed by multiple colors. No more `mockupImagesByColor` as `Record<string, ...>` with multiple keys. |
| **Form state** | `formData.colors` as array; `mockupImagesByColor` as multi-color object; `selectedColorForMockup`; logic that builds `mockup_images_by_color` with multiple color keys. |
| **Validation** | “Please add at least one color variant” and any check that requires `formData.colors.length > 0`. Replace with “exactly one color” or single required color field. |
| **Legacy multi-mockup** | If you keep a single mockup set, remove the old “per-color” mockup UI and the legacy `mockupImageUrls` / `mockupImageFiles` flow that was keyed by color. |

---

## 2. Add Listing Logic (Admin ProductForm) – ADD / CHANGE

| Area | What to do |
|------|------------|
| **Single color** | One color field: name or hex (e.g. “Lavender” or “#E6E6FA”). Store as a single value (e.g. `formData.color` string, or keep `formData.colors` as `[singleColor]` for minimal backend change). |
| **Title** | Optional: “Base name + Color” (e.g. “Premium Tee - Navy”) – either a single title field or base name + auto-suffix from color. |
| **Main image** | Keep one main image per listing (this color). No change to the main image UX. |
| **Mockup images** | One set of mockup images per listing (not keyed by color). Either: (A) single “Mockup images” list (array), or (B) keep `mockup_images_by_color` with a single key (this product’s color) for backward compatibility. Prefer (A) for clarity. |
| **Payload** | Send one color (string or array of length 1); send one mockup set (array or single-key object). Sizes unchanged (array). |

---

## 3. Backend (Products API) – REMOVE / CHANGE

| Area | What to do |
|------|------------|
| **Create product** | Accept `color` (string) or `colors` (array of length 1). Store `variants` as `{ sizes: sizesArray, colors: [thatOneColor] }` (or add a top-level `color` column and keep `variants.sizes` only – your choice). |
| **Update product** | Same as create: single color only. |
| **Mockup storage** | **Remove** create/update logic that writes to `product_variants` (table was dropped in 007). **Add/use** storage on `products`: e.g. `mockup_images` (array) or `mockup_images_by_color` (object with one key). Ensure product create/update persist mockups to the products row, not product_variants. |
| **Response** | Keep `variants: { sizes, colors }` with `colors` of length 1 (or expose `color` and derive `variants.colors`). For mockups, either `mockup_images` or `variants_with_mockups` with one key so PDP can show one gallery. |

---

## 4. Backend – Optional / Later

| Area | What to do |
|------|------------|
| **ProductVariants (Qikink)** | `product_variants` table is dropped; routes in `productVariants.ts` that read/write it will fail. With one listing per color, “variants” are effectively sizes only. Either: remove/repurpose these routes, or introduce a new concept (e.g. size-only SKU mapping on the product row). |
| **Orders validation** | Order validation that checks “color in product.variants.colors” remains valid (product will have one color). No change required. |

---

## 5. Storefront – REMOVE

| Area | What to remove |
|------|----------------|
| **ProductDetailPage** | Color selector UI (swatches + “Color” label). Logic that switches main/mockup images by `selectedColor` and `variants_with_mockups[selectedColor]`. |
| **ProductDetailPage** | `selectedColor` state; effect that updates `selectedImage` when `selectedColor` changes; add-to-cart passing `selectedColor` (can derive from `product.variants.colors[0]` or product’s single color). |
| **ProductCard (listing)** | “Colors:” row with multiple swatches. Can show a single swatch or just the color name. |
| **ProductListPage / CollectionDetailPage** | Color filter (optional: keep as “filter by color” across listings, each listing being one color). |
| **WishlistPage** | Multi-color display for same product (each product now has one color). |
| **Cart** | No removal; keep showing `item.selectedColor` (will be the product’s only color). |

---

## 6. Storefront – ADD / CHANGE

| Area | What to do |
|------|------------|
| **ProductDetailPage** | Only size selector; no color selector. Main image + mockups = this product’s images (one color). Add-to-cart: pass `product.variants.colors[0]` or stored single color as `selectedColor`. |
| **ProductDetailPage** | Image gallery: use `main_image_url` + product’s single mockup set (e.g. `mockup_images` or the single value from `variants_with_mockups`). |
| **ProductCard** | Show one color (swatch and/or name) per product. |
| **Cart / Order** | Keep `order_items.color`; backend already validates color. Value will always be the product’s single color. |
| **Types** | `Product.variants.colors` can remain `string[]` (length 1); optional `Product.color` for convenience. |

---

## 7. Schema / DB (Minimal)

| Area | What to do |
|------|------------|
| **products** | No new columns required if you keep `variants.colors` as `[oneColor]`. Optionally add `color TEXT` and store only sizes in `variants`. Ensure mockups live on `products` (e.g. `mockup_images` JSONB array or `mockup_images_by_color` with one key) – and that create/update write there, not to `product_variants`. |
| **order_items** | Keep `color`; no change. |

---

## 8. Summary Table

| Layer | Remove | Add / Change |
|-------|--------|---------------|
| **ProductForm** | Multi-color list, mockup-by-color multi-key UX, “at least one color” validation | Single color field, one mockup set per listing, “one color” validation |
| **Backend create/update** | Writing mockups to `product_variants` | Accept single color; persist mockups on `products` |
| **PDP** | Color selector, color-driven image switching | Size-only selector; one image set; cart uses product’s single color |
| **ProductCard** | Multiple color swatches | Single swatch or color name |
| **Filters** | (optional) Color filter | Keep or simplify (filter by one color per product) |
| **Cart/Orders** | — | No change (color still stored; one value per product) |

---

## Implementation order suggestion

1. **Backend:** Persist mockups on `products` (fix create/update); accept and store single color.
2. **ProductForm:** Switch to single color + single mockup set; remove multi-color and mockup-by-color UI.
3. **PDP:** Remove color selector; use single image set; pass single color to cart.
4. **ProductCard / list & collection:** Single color display (and optional filter).
5. **Cleanup:** Remove or repurpose `productVariants` routes if still referenced.

Once this is agreed, implementation can proceed step by step.
