import React, { useState, useRef, KeyboardEvent } from 'react';
import { Category, ProductType } from '../../../types';
import { PRODUCT_TYPE_OPTIONS } from '../productTypeConfig';
import api from '../../../services/api';
import { Button, Card, Input } from '../../../components/ui';
import { UploadCloudIcon, LinkIcon, XIcon } from '../../../components/icons';

export const CategoryForm: React.FC<{ category?: Category | null, onSave: () => void, onCancel: () => void }> = ({ category, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    imageUrl: category?.imageUrl || '',
    product_type: (category?.product_type || 'apparel') as ProductType,
  });
  const [complementSlugs, setComplementSlugs] = useState<string[]>(
    category?.complementSlugs ?? []
  );
  const [complementInput, setComplementInput] = useState('');
  const complementInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(category?.imageUrl || null);
  const [useUrl, setUseUrl] = useState(!!category?.imageUrl && !category?.imageUrl.includes('supabase.co'));
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const addComplementSlug = (raw: string) => {
    const slug = generateSlug(raw.trim());
    if (!slug || complementSlugs.includes(slug)) return;
    setComplementSlugs((prev) => [...prev, slug]);
    setComplementInput('');
  };

  const removeComplementSlug = (slug: string) => {
    setComplementSlugs((prev) => prev.filter((s) => s !== slug));
  };

  const handleComplementKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addComplementSlug(complementInput);
    } else if (e.key === 'Backspace' && complementInput === '' && complementSlugs.length > 0) {
      setComplementSlugs((prev) => prev.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name' && !category) {
      // Auto-generate slug from name when creating new category
      setFormData({ ...formData, name: value, slug: generateSlug(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = generateSlug(e.target.value);
    setFormData({ ...formData, slug });
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, imageUrl: url });
    setImagePreview(url);
    setImageFile(null);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }
    setImageFile(file);
    setFormData({ ...formData, imageUrl: '' });
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, imageUrl: '' });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let categoryData: any = {
        name: formData.name,
        slug: formData.slug,
        complementSlugs,
        product_type: formData.product_type,
      };

      // If file is selected, convert to base64 and send as imageFile
      if (imageFile) {
        const base64Image = await convertFileToBase64(imageFile);
        categoryData.imageFile = base64Image;
      } else if (formData.imageUrl) {
        // Otherwise use URL
        categoryData.imageUrl = formData.imageUrl;
      } else {
        alert('Please provide either an image file or image URL');
        setIsSubmitting(false);
        return;
      }

      if(category && category.id) {
        await api.updateCategory(category.id, categoryData);
      } else {
        await api.createCategory(categoryData);
      }
      onSave();
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to save category'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Name */}
        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-2">
            Category Name <span className="text-red-400">*</span>
          </label>
          <Input 
            name="name" 
            placeholder="e.g., T-Shirts, Hoodies, Accessories" 
            value={formData.name} 
            onChange={handleChange} 
            required
            className="w-full"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-2">
            Slug <span className="text-red-400">*</span>
          </label>
          <Input 
            name="slug" 
            placeholder="t-shirts (auto-generated)" 
            value={formData.slug} 
            onChange={handleSlugChange} 
            required
            className="w-full"
          />
          <p className="mt-1 text-xs text-brand-secondary">URL-friendly identifier (auto-generated from name)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-2">
            Product type <span className="text-red-400">*</span>
          </label>
          <select
            name="product_type"
            value={formData.product_type}
            onChange={(e) =>
              setFormData({ ...formData, product_type: e.target.value as ProductType })
            }
            className="w-full rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary"
          >
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-brand-secondary">
            Controls which fields appear when adding products to this category.
          </p>
        </div>

        {/* Cross-sell complement categories */}
        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-1">
            Cross-sell Categories
          </label>
          <p className="text-xs text-brand-secondary mb-3">
            When a product from <strong className="text-brand-primary">{formData.name || 'this category'}</strong> is in the cart, show products from these categories. Type a slug and press <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">Enter</kbd> or <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">,</kbd> to add.
          </p>
          <div
            className="min-h-[44px] flex flex-wrap gap-2 items-center px-3 py-2 rounded-lg border border-white/20 bg-brand-surface focus-within:border-purple-500/60 transition-colors cursor-text"
            onClick={() => complementInputRef.current?.focus()}
          >
            {complementSlugs.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-medium text-purple-300"
              >
                {slug}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeComplementSlug(slug); }}
                  className="hover:text-white transition-colors"
                  aria-label={`Remove ${slug}`}
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={complementInputRef}
              type="text"
              value={complementInput}
              onChange={(e) => setComplementInput(e.target.value)}
              onKeyDown={handleComplementKeyDown}
              onBlur={() => { if (complementInput.trim()) addComplementSlug(complementInput); }}
              placeholder={complementSlugs.length === 0 ? 'e.g. stickers, tote-bags, wall-art' : ''}
              className="flex-1 min-w-[160px] bg-transparent outline-none text-sm text-brand-primary placeholder:text-brand-secondary/50"
            />
          </div>
          {complementSlugs.length > 0 && (
            <p className="mt-1.5 text-xs text-brand-secondary">
              {complementSlugs.length} complement{complementSlugs.length > 1 ? 's' : ''} set. Remember to also add <strong className="text-brand-primary">{formData.slug || 'this slug'}</strong> to those categories if you want the cross-sell to be bidirectional.
            </p>
          )}
        </div>

        {/* Image Section */}
        <div>
          <label className="block text-sm font-semibold text-brand-primary mb-3">
            Category Image <span className="text-red-400">*</span>
          </label>

          {/* Toggle between URL and File Upload */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setUseUrl(true);
                setImageFile(null);
                if (formData.imageUrl) {
                  setImagePreview(formData.imageUrl);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                useUrl
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-brand-surface text-brand-secondary hover:text-brand-primary border border-white/10'
              }`}
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Use URL
            </button>
            <button
              type="button"
              onClick={() => {
                setUseUrl(false);
                setFormData({ ...formData, imageUrl: '' });
                if (imageFile) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                  };
                  reader.readAsDataURL(imageFile);
                } else {
                  setImagePreview(null);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !useUrl
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-brand-surface text-brand-secondary hover:text-brand-primary border border-white/10'
              }`}
            >
              <UploadCloudIcon className="w-4 h-4 inline mr-2" />
              Upload File
            </button>
          </div>

          {/* URL Input */}
          {useUrl && (
            <div className="space-y-3">
              <Input
                name="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={handleImageUrlChange}
                className="w-full"
              />
              {imagePreview && (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-32 h-32 object-cover rounded-lg border-2 border-white/20"
                    onError={() => setImagePreview(null)}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* File Upload with Drag & Drop */}
          {!useUrl && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10 scale-105'
                  : 'border-white/20 bg-brand-surface/50 hover:border-purple-400/50'
              }`}
            >
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-48 h-48 object-cover rounded-lg border-2 border-white/20 mx-auto shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm text-brand-primary font-medium">{imageFile?.name}</p>
                    <p className="text-xs text-brand-secondary">
                      {(imageFile?.size ? imageFile.size / 1024 : 0).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="text-sm text-brand-accent hover:text-brand-accent-hover transition-colors"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <UploadCloudIcon className="w-12 h-12 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-brand-primary font-medium mb-1">
                      Drag & drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-brand-secondary">
                      Supports: JPEG, PNG, WebP (Max 5MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    Select Image
                  </button>
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting || (!imageFile && !formData.imageUrl)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
  );
};
