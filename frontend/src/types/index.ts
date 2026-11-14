export type ArtMaterial = 'framed_acp' | 'canvas' | 'sunboard' | 'neon';

/** @deprecated Use ArtMaterial — apparel removed for art-only store */
export type ProductType = ArtMaterial;

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  isActive?: boolean;
  /** Slugs of categories to cross-sell when this category is in the cart */
  complementSlugs?: string[];
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
  /** Fixed material for this listing (artwork is designed for this surface) */
  material?: ArtMaterial;
  selling_price: number;
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
  /** Optional link for “also available as…” across materials */
  design_family?: string | null;
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility (computed)
  name?: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  category?: string;
  category_name?: string;
  category_slug?: string;
  tags?: string[];
  reviewCount?: number;
  discount?: string;
  is_active?: boolean;
  /** Admin-curated Featured Art (homepage carousel + /featured-art) */
  is_featured?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  /** Kept optional for cart persistence; unused for art listings */
  selectedColor?: string;
  /** Present when item was created via Your Art customizer */
  customArtRequestId?: string;
  customImageUrl?: string;
  mockupImageUrl?: string;
}

export interface CustomArtRequest {
  id: string;
  user_id?: string | null;
  auth_user_id?: string | null;
  guest_session_id?: string | null;
  customer_email?: string | null;
  material: ArtMaterial;
  size: string;
  neon_text?: string | null;
  title?: string | null;
  unit_price: number;
  original_image_url?: string | null;
  original_storage_path?: string | null;
  mockup_image_url?: string | null;
  mockup_storage_path?: string | null;
  enhanced_image_url?: string | null;
  enhanced_storage_path?: string | null;
  ai_provider?: string | null;
  ai_action?: string | null;
  ai_status: 'none' | 'processing' | 'ready' | 'failed';
  ai_notes?: string | null;
  order_id?: string | null;
  order_number?: string | null;
  status: 'draft' | 'in_cart' | 'ordered' | 'enhanced' | 'ready_for_print' | 'fulfilled' | 'cancelled';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
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
