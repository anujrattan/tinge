/**
 * Structured Data Component
 * JSON-LD structured data for SEO
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { DEFAULT_SITE_NAME, DEFAULT_SITE_URL } from '../utils/seo';

interface StructuredDataProps {
  data: object;
}

export const StructuredData: React.FC<StructuredDataProps> = ({ data }) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
};

/**
 * Organization Schema
 */
export const OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: DEFAULT_SITE_NAME,
  url: DEFAULT_SITE_URL,
  logo: `${DEFAULT_SITE_URL}/logo.png`,
  sameAs: [
    // Add social media links here
    // 'https://www.facebook.com/luxethreads',
    // 'https://www.instagram.com/luxethreads',
    // 'https://twitter.com/luxethreads',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: 'support@luxethreads.com',
  },
};

/**
 * Website Schema with Search Action
 */
export const WebsiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: DEFAULT_SITE_NAME,
  url: DEFAULT_SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${DEFAULT_SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

/**
 * Product Schema
 */
export const createProductSchema = (product: {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  image?: string;
  availability?: string;
  brand?: string;
  category?: string;
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.image || undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand || DEFAULT_SITE_NAME,
    },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: `${DEFAULT_SITE_URL}/product/${product.id}`,
      priceCurrency: product.currency || 'INR',
      price: product.price,
      availability: product.availability || 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
};

/**
 * BreadcrumbList Schema
 */
export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * FAQPage Schema
 */
export const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};
