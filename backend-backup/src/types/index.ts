/**
 * Shared TypeScript types for the backend
 */

export interface Product {
  id: string;
  category_id: string;
  title: string;
  description: string;
  selling_price: number;
  discount_percentage?: number;
  on_sale?: boolean;
  sale_discount_percentage?: number;
  usp_tag?: string;
  main_image_url: string;
  mockup_images?: string[];
  mockup_video_url?: string;
  rating?: number;
  review_count?: number;
  variants: {
    sizes: string[];
    colors: string[];
  };
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility (computed)
  name?: string; // alias for title
  price?: number; // computed: selling_price * (1 - discount_percentage/100) * (1 - sale_discount_percentage/100) if on_sale
  originalPrice?: number; // alias for selling_price
  imageUrl?: string; // alias for main_image_url
  category?: string; // category slug (from join)
  tags?: string[]; // computed from usp_tag
  discount?: string; // computed: "Save $X" (cumulative discount)
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  customer: CustomerInfo;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state?: string;
  zip: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  price: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
