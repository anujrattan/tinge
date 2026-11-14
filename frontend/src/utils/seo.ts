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

export const DEFAULT_SITE_NAME = 'Tinge';
export const DEFAULT_SITE_URL = (import.meta as any).env?.VITE_SITE_URL || 'https://tinge.in';
export const DEFAULT_DESCRIPTION = 'Tinge prints wall art in-house: framed UV prints on ACP, canvas, sunboard, and neon. Sizes are cut from a 12 by 4 ft sheet. Pan-India delivery.';
export const DEFAULT_KEYWORDS = 'Tinge, framed ACP print, UV wall art India, canvas print, sunboard print, neon sign, custom wall art, home decor India';
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
  title: generateTitle('Framed ACP, Canvas, Sunboard, and Neon'),
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  image: DEFAULT_IMAGE,
  url: DEFAULT_SITE_URL,
  type: 'website',
  siteName: DEFAULT_SITE_NAME,
});
