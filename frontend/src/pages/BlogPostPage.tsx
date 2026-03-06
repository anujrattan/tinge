import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { SEOHead } from '../components/SEOHead';
import { StructuredData } from '../components/StructuredData';
import { DEFAULT_SITE_URL } from '../utils/seo';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content_markdown: string;
  cover_image?: string;
  seo_title?: string;
  seo_description?: string;
  published_at?: string;
}

// Very small markdown renderer for basic formatting (headings, paragraphs, lists)
const renderMarkdown = (markdown: string) => {
  // For now, keep it simple and safe: split by double newlines into paragraphs.
  const blocks = markdown.split(/\n{2,}/);
  return blocks.map((block, index) => (
    <p key={index} className="mb-4 text-brand-secondary leading-relaxed whitespace-pre-wrap">
      {block.trim()}
    </p>
  ));
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await api.getBlogPostBySlug(slug);
        if (isMounted && res?.post) {
          setPost(res.post);
        } else if (isMounted) {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading blog post:', error);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const title = post?.seo_title || (post ? `${post.title} – Luxe Threads Journal` : 'Article');
  const description =
    post?.seo_description ||
    post?.excerpt ||
    'Read this article from the Luxe Threads Journal for tips on style, printing, and custom apparel.';
  const url = `${DEFAULT_SITE_URL}/blog/${slug || ''}`;

  const articleSchema = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: description,
        image: post.cover_image || `${DEFAULT_SITE_URL}/og-image.jpg`,
        url,
        datePublished: post.published_at || undefined,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
      }
    : null;

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        type="article"
        url={url}
        image={post?.cover_image}
        publishedTime={post?.published_at}
      />
      {articleSchema && <StructuredData data={articleSchema} />}

      <div className="animate-fadeIn pb-16">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-3xl">
          {loading ? (
            <p className="text-center text-brand-secondary">Loading article…</p>
          ) : notFound || !post ? (
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-brand-primary">
                Article not found
              </h1>
              <p className="mt-4 text-brand-secondary">
                The article you&apos;re looking for may have been unpublished or moved.
              </p>
            </div>
          ) : (
            <>
              {post.published_at && (
                <p className="text-xs text-brand-muted mb-3">
                  {new Date(post.published_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-primary mb-4">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-lg text-brand-secondary mb-6">{post.excerpt}</p>
              )}
              {post.cover_image && (
                <div className="mb-8 rounded-xl overflow-hidden">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="prose prose-invert max-w-none">
                {renderMarkdown(post.content_markdown || '')}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
};

