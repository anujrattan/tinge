# Plan: Storing Gelato Template Data

## Current Database Schema

### Products Table
- `title` - TEXT (our custom title)
- `description` - TEXT (our custom description)
- `variants` - JSONB `{"sizes": [], "colors": []}` (our simplified variant structure)
- `gelato_template_id` - TEXT (already storing)
- `gelato_product_id` - TEXT (for when product is created in Gelato)
- `gelato_design_urls` - JSONB (array of design URLs)
- `gelato_status` - TEXT

### Product Variants Table
- `gelato_variant_id` - TEXT (variant ID from Gelato)
- `gelato_product_id` - TEXT (product UID from Gelato)
- `variant_data` - JSONB (flexible storage for variant metadata)

## Gelato Template Response Structure

```json
{
  "id": "template-id",
  "templateName": "Classic Unisex Pullover Hoodie | Gildan® 18500 White",
  "title": "Classic Unisex Pullover Hoodie | Gildan® 18500 White",
  "description": "<ul>...</ul>", // HTML description
  "previewUrl": "https://...",
  "variants": [
    {
      "id": "variant-id",
      "title": "White - L - DTG",
      "productUid": "apparel_product_...",
      "variantOptions": [{"name": "Size", "value": "L"}],
      "imagePlaceholders": [{"name": "Image 3", "height": 305, "width": 305, "printArea": "front"}],
      "textPlaceholders": []
    }
  ]
}
```

## Storage Plan

### Option 1: Store Template Metadata in Products Table (Recommended)

**Add new columns to products table:**
```sql
ALTER TABLE products
  ADD COLUMN gelato_template_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN gelato_preview_url TEXT;
```

**What to store in `gelato_template_data`:**
- `templateName` - Full template name from Gelato
- `previewUrl` - Template preview image URL
- `imagePlaceholders` - Array of all image placeholders (from all variants)
- `textPlaceholders` - Array of all text placeholders (from all variants)
- `createdAt` - Template creation date
- `updatedAt` - Template update date

**What to store in `gelato_preview_url`:**
- Direct access to preview image (for quick display)

### Option 2: Store Variants in product_variants Table

**For each variant in template response:**
- Insert/update record in `product_variants` table
- `gelato_variant_id` = variant.id
- `gelato_product_id` = variant.productUid (this is the Gelato product UID)
- `variant_data` JSONB should contain:
  ```json
  {
    "title": "White - L - DTG",
    "size": "L",
    "color": "White",
    "productUid": "apparel_product_...",
    "imagePlaceholders": [...],
    "textPlaceholders": [...],
    "variantOptions": [...]
  }
  ```

### Option 3: Sync Variants to Products.variants Field

**Extract sizes and colors from variants:**
- Parse `variantOptions` to extract sizes
- Extract colors from variant title or variantOptions
- Update `products.variants` JSONB field:
  ```json
  {
    "sizes": ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    "colors": ["White"]
  }
  ```

## Description Strategy

### Recommendation: **Hybrid Approach**

1. **Store Gelato description as reference** in `gelato_template_data`
2. **Use custom description** in `products.description` field
3. **Allow admin to choose**:
   - Use Gelato description (copy from template)
   - Use custom description (admin-written)
   - Merge both (Gelato description + custom additions)

**Rationale:**
- Gelato descriptions are often technical/HTML formatted
- Our store may need custom marketing copy
- Admin should have control over what customers see
- Gelato description can serve as reference/fallback

## Implementation Steps

1. **Create migration** to add `gelato_template_data` and `gelato_preview_url` columns
2. **Update product save logic** to:
   - Fetch template when `gelato_template_id` is provided
   - Store template metadata in `gelato_template_data`
   - Store preview URL in `gelato_preview_url`
   - Parse variants and store in `product_variants` table
   - Extract sizes/colors and update `products.variants` field
3. **Update admin form** (optional):
   - Show Gelato description as reference
   - Allow admin to copy Gelato description to custom description
   - Display preview image from `gelato_preview_url`

## Questions to Decide

1. **Description**: Use Gelato's HTML description or keep custom?
   - ✅ Recommendation: Keep custom, store Gelato as reference

2. **Title**: Use Gelato's title or keep custom?
   - ✅ Recommendation: Keep custom, store Gelato as reference

3. **Variants**: Auto-sync sizes/colors from template or manual?
   - ✅ Recommendation: Auto-sync, but allow manual override

4. **Preview Image**: Use Gelato preview or keep custom main_image_url?
   - ✅ Recommendation: Keep custom, but show Gelato preview in admin

5. **Variant Storage**: Store all variant details or just IDs?
   - ✅ Recommendation: Store full variant details in `variant_data` JSONB

