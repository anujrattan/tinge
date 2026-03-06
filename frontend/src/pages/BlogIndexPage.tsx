import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { SEOHead } from '../components/SEOHead';
import { StructuredData } from '../components/StructuredData';
import { DEFAULT_SITE_URL } from '../utils/seo';
import { Link } from 'react-router-dom';

interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image?: string;
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
}

export const BlogIndexPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.getBlogPosts(20, 0);
        if (isMounted && res?.posts) {
          setPosts(res.posts);
        }
      } catch (error) {
        console.error('Error loading blog posts:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const seoTitle = 'Luxe Threads Journal – Guides, Style Tips & Print-on-Demand Insights';
  const seoDescription =
    'Read Luxe Threads articles on style tips, product guides, print-on-demand insights, and how to get the most out of your custom apparel.';

  const blogListSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Luxe Threads Journal',
    url: `${DEFAULT_SITE_URL}/blog`,
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${DEFAULT_SITE_URL}/blog/${post.slug}`,
      datePublished: post.published_at || undefined,
      description: post.seo_description || post.excerpt || undefined,
    })),
  };

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        type="article"
        url={`${DEFAULT_SITE_URL}/blog`}
        keywords="blog, articles, style guide, print on demand, Luxe Threads"
      />
      <StructuredData data={blogListSchema} />

      <div className="animate-fadeIn pb-16">
        <section className="relative py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-brand-primary">
                Luxe Threads Journal
              </h1>
              <p className="mt-4 text-lg text-brand-secondary">
                Deep dives on style, printing, and making the most of your Luxe Threads store.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <p className="text-center text-brand-secondary">Loading articles…</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-brand-secondary">
              Articles are coming soon. Stay tuned for style tips, guides, and more.
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-brand-surface rounded-xl border border-white/10 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  {post.cover_image && (
                    <Link to={`/blog/${post.slug}`}>
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    </Link>
                  )}
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex-1">
                      <Link to={`/blog/${post.slug}`}>
                        <h2 className="text-xl font-display font-semibold text-brand-primary hover:text-brand-accent transition-colors">
                          {post.title}
                        </h2>
                      </Link>
                      {post.published_at && (
                        <p className="mt-2 text-xs text-brand-muted">
                          {new Date(post.published_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                      {post.excerpt && (
                        <p className="mt-3 text-sm text-brand-secondary line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="mt-4">
                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
                      >
                        Read article →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

