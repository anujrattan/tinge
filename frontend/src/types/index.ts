export type ProductType = 'apparel' | 'poster';

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  isActive?: boolean;
  /** Slugs of categories to cross-sell when this category is in the cart */
  complementSlugs?: string[];
  product_type?: ProductType;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
}

export interface Product {
  id: string;
  category_id: string;
  collection_id?: string | null;
  title: string;
  description: string;
  selling_price: number;
  vendor_base_cost?: number;
  vendor_shipping_cost?: number;
  target_margin_percent?: number;
  discount_percentage?: number;
  on_sale?: boolean;
  sale_discount_percentage?: number;
  usp_tag?: string;
  main_image_url: string;
  mockup_images?: string[];
  mockup_video_url?: string;
  rating?: number;
  rating_count?: number;
  review_count?: number;
  variants: {
    sizes: string[];
    /** Optional per-size selling prices (canonical size keys). */
    size_prices?: Record<string, number>;
  };
  color?: string; // Single color per listing (name or hex)
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility (computed)
  name?: string; // alias for title
  price?: number; // computed: selling_price * (1 - discount_percentage/100) * (1 - sale_discount_percentage/100) if on_sale
  originalPrice?: number; // alias for selling_price
  imageUrl?: string; // alias for main_image_url
  category?: string; // category slug (from join)
  category_name?: string; // human-readable category name (from join)
  category_slug?: string; // category slug used in URLs
  tags?: string[]; // computed from usp_tag
  reviewCount?: number; // alias for review_count
  discount?: string; // computed: "Save $X" (cumulative discount)
  is_active?: boolean;
  fulfillment_partner?: string | null;
  partner_product_id?: string | null;
  /** Per-size Printrove variant details. [{size, partner_variant_id, partner_sku}] */
  partner_variants?: PartnerVariant[] | null;
  size_chart_profile?: string | null;
  design_family?: string | null;
  category_product_type?: ProductType;
}

export interface PartnerVariant {
  size: string;
  partner_variant_id: string;
  partner_sku: string;
  /** Resolved front mockup image URL (e.g. from Printrove `data.variants[i].mockup.front_mockup`) */
  mockup_front_url?: string | null;
  /** Raw Printrove field when stored on the variant object */
  front_mockup?: string | null;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export type Page = 
  | { name: 'home' }
  | { name: 'categories' }
  | { name: 'category'; slug: string }
  | { name: 'product'; id: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'login' }
  | { name: 'admin' }
  | { name: 'order-success' }
  | { name: 'about' }
  | { name: 'contact' }
  | { name: 'best-sellers' }
  | { name: 'new-arrivals' }
  | { name: 'sale' }
  | { name: 'faq' }
  | { name: 'shipping' }
  | { name: 'returns' }
  | { name: 'size-guide' }
  | { name: 'custom-design' };

