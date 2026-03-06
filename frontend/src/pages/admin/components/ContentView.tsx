import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Card, Button, Input, Textarea } from '../../../components/ui';

interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content_markdown: string;
  cover_image?: string;
  seo_title?: string;
  seo_description?: string;
  is_published: boolean;
  published_at?: string;
}

interface AdminFaqItem {
  id: string;
  question: string;
  answer_markdown: string;
  category?: string;
  sort_order?: number;
  is_published: boolean;
}

export const ContentView: React.FC = () => {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [faqs, setFaqs] = useState<AdminFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingPost, setEditingPost] = useState<AdminBlogPost | null>(null);
  const [editingFaq, setEditingFaq] = useState<AdminFaqItem | null>(null);

  const emptyPost: AdminBlogPost = {
    id: '',
    slug: '',
    title: '',
    excerpt: '',
    content_markdown: '',
    cover_image: '',
    seo_title: '',
    seo_description: '',
    is_published: false,
  };

  const emptyFaq: AdminFaqItem = {
    id: '',
    question: '',
    answer_markdown: '',
    category: '',
    sort_order: 0,
    is_published: true,
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [blogRes, faqRes] = await Promise.all([
        api.getBlogPostsAdmin(),
        api.getFaqsAdmin(),
      ]);
      if (blogRes?.posts) setPosts(blogRes.posts);
      if (faqRes?.items) setFaqs(faqRes.items);
    } catch (error) {
      console.error('Error loading content for admin:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePostChange = (field: keyof AdminBlogPost, value: any) => {
    setEditingPost((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleFaqChange = (field: keyof AdminFaqItem, value: any) => {
    setEditingFaq((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const savePost = async () => {
    if (!editingPost) return;
    setSaving(true);
    try {
      const payload = {
        slug: editingPost.slug,
        title: editingPost.title,
        excerpt: editingPost.excerpt,
        content_markdown: editingPost.content_markdown,
        cover_image: editingPost.cover_image,
        seo_title: editingPost.seo_title,
        seo_description: editingPost.seo_description,
        is_published: editingPost.is_published,
      };

      if (editingPost.id) {
        await api.updateBlogPost(editingPost.id, payload);
      } else {
        await api.createBlogPost(payload);
      }
      await loadData();
      setEditingPost(null);
    } catch (error) {
      console.error('Error saving blog post:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveFaq = async () => {
    if (!editingFaq) return;
    setSaving(true);
    try {
      const payload = {
        question: editingFaq.question,
        answer_markdown: editingFaq.answer_markdown,
        category: editingFaq.category,
        sort_order: editingFaq.sort_order ?? 0,
        is_published: editingFaq.is_published,
      };

      if (editingFaq.id) {
        await api.updateFaqItem(editingFaq.id, payload);
      } else {
        await api.createFaqItem(payload);
      }
      await loadData();
      setEditingFaq(null);
    } catch (error) {
      console.error('Error saving FAQ item:', error);
    } finally {
      setSaving(false);
    }
  };

  const togglePostPublish = async (id: string) => {
    try {
      await api.toggleBlogPostPublish(id);
      await loadData();
    } catch (error) {
      console.error('Error toggling blog publish:', error);
    }
  };

  const toggleFaqPublish = async (id: string) => {
    try {
      await api.toggleFaqPublish(id);
      await loadData();
    } catch (error) {
      console.error('Error toggling FAQ publish:', error);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Blog Manager */}
      <Card className="p-6 bg-white dark:bg-brand-surface/60 border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-semibold text-brand-primary">Blog Posts</h3>
            <p className="text-sm text-brand-secondary">
              Create and update articles for the Luxe Threads Journal.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditingPost({ ...emptyPost })}
          >
            New Post
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-brand-secondary">Loading posts…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-brand-secondary">No posts yet. Create your first article.</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setEditingPost(post)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  editingPost && editingPost.id === post.id
                    ? 'bg-white dark:bg-white/10 border-brand-accent/60'
                    : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/5'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-primary truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-brand-secondary truncate">
                    /blog/{post.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      post.is_published
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-gray-500/10 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {post.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {editingPost && (
          <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Title
              </p>
              <Input
                value={editingPost.title}
                onChange={(e) => handlePostChange('title', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Slug
              </p>
              <Input
                value={editingPost.slug}
                onChange={(e) => handlePostChange('slug', e.target.value)}
                placeholder="e.g. getting-started-with-luxe-threads"
              />
              <p className="text-[11px] text-brand-muted">
                Used in the URL, for example <span className="font-mono">/blog/{'{slug}'}</span>.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Cover Image URL
              </p>
              <Input
                value={editingPost.cover_image || ''}
                onChange={(e) => handlePostChange('cover_image', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Excerpt
              </p>
              <Input
                value={editingPost.excerpt || ''}
                onChange={(e) => handlePostChange('excerpt', e.target.value)}
                placeholder="Short summary shown on listing pages"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Content (Markdown)
              </p>
              <Textarea
                rows={6}
                value={editingPost.content_markdown}
                onChange={(e) => handlePostChange('content_markdown', e.target.value)}
                placeholder="Write the full article content in Markdown..."
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                SEO Title (optional)
              </p>
              <Input
                value={editingPost.seo_title || ''}
                onChange={(e) => handlePostChange('seo_title', e.target.value)}
                placeholder="Custom meta title for search engines"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                SEO Description (optional)
              </p>
              <Textarea
                rows={2}
                value={editingPost.seo_description || ''}
                onChange={(e) => handlePostChange('seo_description', e.target.value)}
                placeholder="Meta description that appears in search results"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm text-brand-secondary">
                <input
                  type="checkbox"
                  checked={editingPost.is_published}
                  onChange={(e) => handlePostChange('is_published', e.target.checked)}
                />
                <span>Published</span>
              </label>
              <div className="flex gap-2">
                {editingPost.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => togglePostPublish(editingPost.id)}
                  >
                    Toggle Publish
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={savePost}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* FAQ Manager */}
      <Card className="p-6 bg-white dark:bg-brand-surface/60 border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-semibold text-brand-primary">FAQ Items</h3>
            <p className="text-sm text-brand-secondary">
              Manage questions that power your FAQ page and FAQ schema.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditingFaq({ ...emptyFaq })}
          >
            New FAQ
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-brand-secondary">Loading FAQs…</p>
        ) : faqs.length === 0 ? (
          <p className="text-sm text-brand-secondary">No FAQ items yet. Seed some helpful answers.</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
            {faqs.map((item) => (
              <button
                key={item.id}
                onClick={() => setEditingFaq(item)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  editingFaq && editingFaq.id === item.id
                    ? 'bg-white dark:bg-white/10 border-brand-accent/60'
                    : 'bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-white/5'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-primary truncate">
                    {item.question}
                  </p>
                  {item.category && (
                    <p className="text-xs text-brand-secondary truncate">
                      {item.category}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    item.is_published
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-gray-500/10 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {item.is_published ? 'Active' : 'Hidden'}
                </span>
              </button>
            ))}
          </div>
        )}

        {editingFaq && (
          <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Question
              </p>
              <Input
                value={editingFaq.question}
                onChange={(e) => handleFaqChange('question', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Category
              </p>
              <Input
                value={editingFaq.category || ''}
                onChange={(e) => handleFaqChange('category', e.target.value)}
                placeholder="E.g. Shipping, Payments, Orders"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Sort Order
              </p>
              <Input
                type="number"
                value={editingFaq.sort_order ?? 0}
                onChange={(e) =>
                  handleFaqChange('sort_order', Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Answer (Markdown)
              </p>
              <Textarea
                rows={5}
                value={editingFaq.answer_markdown}
                onChange={(e) =>
                  handleFaqChange('answer_markdown', e.target.value)
                }
                placeholder="Write the answer in Markdown..."
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm text-brand-secondary">
                <input
                  type="checkbox"
                  checked={editingFaq.is_published}
                  onChange={(e) =>
                    handleFaqChange('is_published', e.target.checked)
                  }
                />
                <span>Visible on site</span>
              </label>
              <div className="flex gap-2">
                {editingFaq.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFaqPublish(editingFaq.id)}
                  >
                    Toggle Publish
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingFaq(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveFaq}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

