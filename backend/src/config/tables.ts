/**
 * Tinge tables in a shared Supabase database.
 * Prefixed with `tinge_` so they stay distinct from other apps (e.g. real estate).
 * Underscores (not hyphens) — required for PostgREST embeds / FK joins.
 */

export const TingeTables = {
  categories: 'tinge_categories',
  collections: 'tinge_collections',
  products: 'tinge_products',
  users: 'tinge_users',
  userProfiles: 'tinge_user_profiles',
  userAddresses: 'tinge_user_addresses',
  orders: 'tinge_orders',
  orderItems: 'tinge_order_items',
  addresses: 'tinge_addresses',
  payments: 'tinge_payments',
  orderSequences: 'tinge_order_sequences',
  orderStatusHistory: 'tinge_order_status_history',
  wishlists: 'tinge_wishlists',
  productRatings: 'tinge_product_ratings',
  newsletterSubscribers: 'tinge_newsletter_subscribers',
  blogPosts: 'tinge_blog_posts',
  faqItems: 'tinge_faq_items',
  returnRequests: 'tinge_return_requests',
  returnStatusHistory: 'tinge_return_status_history',
  colorProfiles: 'tinge_color_profiles',
  customArtRequests: 'tinge_custom_art_requests',
} as const;

export type TingeTable = (typeof TingeTables)[keyof typeof TingeTables];

/** RPC function names (also prefixed to avoid collisions). */
export const TingeRpc = {
  getNextOrderSequence: 'tinge_get_next_order_sequence',
} as const;
