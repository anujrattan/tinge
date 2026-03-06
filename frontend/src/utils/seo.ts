/**
 * SEO Utilities
 * Helper functions for SEO meta tags and structured data
 */

export interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article' | 'profile';
  siteName?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const DEFAULT_SITE_NAME = 'Luxe Threads';
export const DEFAULT_SITE_URL = process.env.VITE_SITE_URL || 'https://luxethreads.com';
export const DEFAULT_DESCRIPTION = 'Shop premium apparel and custom clothing at Luxe Threads. Designer t-shirts, luxury fashion, and print-on-demand apparel. Free shipping on orders over ₹500.';
export const DEFAULT_KEYWORDS = 'premium apparel, luxury clothing, custom t-shirts, designer fashion, print on demand, luxury fashion online, custom clothing, designer t-shirts';
export const DEFAULT_IMAGE = `${DEFAULT_SITE_URL}/og-image.jpg`;

/**
 * Generate full page title
 */
export const generateTitle = (title: string, includeSiteName: boolean = true): string => {
  if (includeSiteName) {
    return `${title} | ${DEFAULT_SITE_NAME}`;
  }
  return title;
};

/**
 * Generate canonical URL
 */
export const generateCanonicalUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${DEFAULT_SITE_URL}${cleanPath}`;
};

/**
 * Truncate description for meta tags (max 160 characters)
 */
export const truncateDescription = (description: string, maxLength: number = 160): string => {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength - 3) + '...';
};

/**
 * Default SEO data
 */
export const getDefaultSEO = (): SEOData => ({
  title: generateTitle('Premium Apparel & Custom Clothing Online'),
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  image: DEFAULT_IMAGE,
  url: DEFAULT_SITE_URL,
  type: 'website',
  siteName: DEFAULT_SITE_NAME,
});
