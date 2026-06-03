import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, Collection, PartnerVariant } from '../../../types';
import { PrintrovePrefill } from './PrintroveSyncModal';
import api from '../../../services/api';
import { Button, Card, Input } from '../../../components/ui';
import { UploadCloudIcon, LinkIcon, XIcon, PlusIcon } from '../../../components/icons';
import { ProductCardPreview } from '../../../components/ProductCardPreview';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';
import { useApp } from '../../../context/AppContext';
import { getCssColorValue, getColorName, setDynamicColorProfiles } from '../../../utils/colorUtils';
import { createPricingValidationPayload, toAnchoredDisplayPrice } from '../../../utils/pricing';
import { normalizeSizeList, PREFERRED_SIZES } from '../../../utils/sizeSystem';

export const ProductForm: React.FC<{
  product?: Product | null;
  prefill?: PrintrovePrefill | null;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
}> = ({ product, prefill, onSave, onCancel, categories, collections }) => {
  const { currency } = useApp();
  const designFamilyWrapperRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState({
    title: prefill?.title || product?.title || product?.name || '',
    description: product?.description || '',
    selling_price: product?.selling_price || product?.price || 0,
    vendor_base_cost: (product as any)?.vendor_base_cost || '',
    vendor_shipping_cost: (product as any)?.vendor_shipping_cost || '',
    target_margin_percent: (product as any)?.target_margin_percent ?? 100,
    discount_percentage: product?.discount_percentage || 0,
    on_sale: product?.on_sale || false,
    sale_discount_percentage: product?.sale_discount_percentage || 0,
    usp_tag: product?.usp_tag || '',
    main_image_url: prefill?.main_image_url || product?.main_image_url || product?.imageUrl || '',
    category_id: product?.category_id || categories[0]?.id || '',
    collection_id: product?.collection_id || '',
    mockup_images: (prefill?.mockup_images ?? product?.mockup_images) || [],
    mockup_video_url: product?.mockup_video_url || '',
    sizes: prefill?.sizes || product?.variants?.sizes || [],
    color: prefill?.color || (product as any)?.color || '',
    fulfillment_partner: prefill?.fulfillment_partner || (product as any)?.fulfillment_partner || '',
    partner_product_id: prefill?.partner_product_id || (product as any)?.partner_product_id || '',
    partner_variants: (prefill?.partner_variants ?? (product as any)?.partner_variants as PartnerVariant[] | null) ?? [],
    size_chart_profile: (product as any)?.size_chart_profile || '',
    design_family: (product as any)?.design_family || '',
  });

  // Available sizes
  const availableSizes = [...PREFERRED_SIZES];

  // File upload states
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const initialImageUrl = prefill?.main_image_url || product?.main_image_url || product?.imageUrl || null;
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(initialImageUrl);
  const [useMainImageUrl, setUseMainImageUrl] = useState(
    !!(prefill?.main_image_url) || (!!(product?.main_image_url || product?.imageUrl) && !(product?.main_image_url || product?.imageUrl)?.includes('supabase.co'))
  );
  
  // Legacy mockup states (for backward compatibility, will be removed)
  const [mockupImageUrls, setMockupImageUrls] = useState<string[]>(formData.mockup_images || []);
  const [mockupImageFiles, setMockupImageFiles] = useState<(File | null)[]>([]);
  const [mockupImagePreviews, setMockupImagePreviews] = useState<string[]>([]);
  const [mockupImageUseUrl, setMockupImageUseUrl] = useState<boolean[]>([]);
  const [mockupImageIsDragging, setMockupImageIsDragging] = useState<boolean[]>([]);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(product?.mockup_video_url || null);
  const [useVideoUrl, setUseVideoUrl] = useState(!!product?.mockup_video_url && !product?.mockup_video_url?.includes('supabase.co'));
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designFamilySuggestions, setDesignFamilySuggestions] = useState<string[]>([]);
  const [isDesignFamilyLoading, setIsDesignFamilyLoading] = useState(false);
  const [showDesignFamilySuggestions, setShowDesignFamilySuggestions] = useState(false);
  const designFamilyQuery = String((formData as any).design_family || '').trim();
  const [colorProfiles, setColorProfiles] = useState<{ name: string; hex: string }[]>([]);
  const [needsColorName, setNeedsColorName] = useState(false);
  const [customColorName, setCustomColorName] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  // Main Image Handlers
  const handleMainImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, main_image_url: url });
    setMainImagePreview(url);
    setMainImageFile(null);
  };

  const handleMainImageFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }
    setMainImageFile(file);
    setFormData({ ...formData, main_image_url: '' });
    const reader = new FileReader();
    reader.onloadend = () => {
      setMainImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMainImageFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMainImageFileSelect(file);
    }
  };

  const handleMainImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMainImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMainImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleMainImageFileSelect(file);
    }
  };

  const removeMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview(null);
    setFormData({ ...formData, main_image_url: '' });
  };

  const handleMockupImageAdd = () => {
    if (mockupImageUrls.length < 4) {
      setMockupImageUrls([...mockupImageUrls, '']);
      setMockupImageFiles([...mockupImageFiles, null]);
      setMockupImagePreviews([...mockupImagePreviews, '']);
      setMockupImageUseUrl([...mockupImageUseUrl, true]);
      setMockupImageIsDragging([...mockupImageIsDragging, false]);
    }
  };

  const handleMockupImageRemoveLegacy = (index: number) => {
    setMockupImageUrls(mockupImageUrls.filter((_, i) => i !== index));
    setMockupImageFiles(mockupImageFiles.filter((_, i) => i !== index));
    setMockupImagePreviews(mockupImagePreviews.filter((_, i) => i !== index));
    setMockupImageUseUrl(mockupImageUseUrl.filter((_, i) => i !== index));
    setMockupImageIsDragging(mockupImageIsDragging.filter((_, i) => i !== index));
  };

  const handleMockupImageUrlChange = (index: number, url: string) => {
    const newUrls = [...mockupImageUrls];
    newUrls[index] = url;
    setMockupImageUrls(newUrls);
    
    const newPreviews = [...mockupImagePreviews];
    newPreviews[index] = url;
    setMockupImagePreviews(newPreviews);
    
    const newFiles = [...mockupImageFiles];
    newFiles[index] = null;
    setMockupImageFiles(newFiles);
  };

  const handleMockupImageFileSelectLegacy = (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }
    const newFiles = [...mockupImageFiles];
    newFiles[index] = file;
    setMockupImageFiles(newFiles);
    
    const newUrls = [...mockupImageUrls];
    newUrls[index] = '';
    setMockupImageUrls(newUrls);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...mockupImagePreviews];
      newPreviews[index] = reader.result as string;
      setMockupImagePreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const handleMockupImageDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const newDragging = [...mockupImageIsDragging];
    newDragging[index] = true;
    setMockupImageIsDragging(newDragging);
  };

  const handleMockupImageDragLeave = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const newDragging = [...mockupImageIsDragging];
    newDragging[index] = false;
    setMockupImageIsDragging(newDragging);
  };

  const handleMockupImageDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const newDragging = [...mockupImageIsDragging];
    newDragging[index] = false;
    setMockupImageIsDragging(newDragging);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleMockupImageFileSelectLegacy(index, file);
    }
  };

  // Video Handlers
  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, mockup_video_url: url });
    setVideoPreview(url);
    setVideoFile(null);
  };

  const handleVideoFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Video size should be less than 50MB');
      return;
    }
    setVideoFile(file);
    setFormData({ ...formData, mockup_video_url: '' });
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoFileSelect(file);
    }
  };

  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(false);
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleVideoFileSelect(file);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setFormData({ ...formData, mockup_video_url: '' });
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
  
  const isDraft = product ? product.is_active === false : false;

  const handleSubmit = async (e: React.FormEvent, publishNow = false) => {
    e.preventDefault();

    const savingAsDraft = isDraft && !publishNow;

    if (!savingAsDraft && formData.sizes.length === 0) {
      alert('Please add at least one size variant');
      return;
    }

    const rawColor = String(formData.color || '').trim();
    const isHexColor = /^#[0-9A-Fa-f]{6}$/.test(rawColor);
    if (needsColorName && isHexColor && !customColorName.trim()) {
      alert('Please enter a color name for this new hex value.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalMainImageUrl = formData.main_image_url;
      if (mainImageFile) {
        const base64Image = await convertFileToBase64(mainImageFile);
        finalMainImageUrl = base64Image;
      }

      const finalMockupImages: string[] = [];
      for (let i = 0; i < mockupImageUrls.length; i++) {
        if (mockupImageFiles[i]) {
          const base64Image = await convertFileToBase64(mockupImageFiles[i]!);
          finalMockupImages.push(base64Image);
        } else if (mockupImageUrls[i]) {
          finalMockupImages.push(mockupImageUrls[i]);
        }
      }

      // Convert video
      let finalVideoUrl = formData.mockup_video_url;
      if (videoFile) {
        const base64Video = await convertFileToBase64(videoFile);
        finalVideoUrl = base64Video; // Will be sent as videoFile to backend
      }

      // If this is a brand-new hex color with a provided name, persist it before saving the product
      if (needsColorName && isHexColor && customColorName.trim()) {
        try {
          await api.upsertColorProfile(customColorName.trim(), rawColor.toUpperCase());
        } catch (colorError: any) {
          throw new Error(colorError.message || 'Failed to save new color profile. Please try again.');
        }
      }

      const savingAsDraft = isDraft && !publishNow;

      const sizesArray = normalizeSizeList(
        Array.isArray(formData.sizes) ? formData.sizes.filter(s => s && s.trim()) : [],
      );

      const productData: any = {
        category_id: formData.category_id,
        title: formData.title,
        description: formData.description || '',
        selling_price: Number(formData.selling_price) || 0,
        discount_percentage: formData.discount_percentage > 0 ? Number(formData.discount_percentage) : null,
        on_sale: formData.on_sale || false,
        sale_discount_percentage: formData.on_sale && formData.sale_discount_percentage > 0 ? Number(formData.sale_discount_percentage) : null,
        usp_tag: formData.usp_tag || null,
        sizes: sizesArray,
        color: formData.color && String(formData.color).trim() ? String(formData.color).trim() : null,
        fulfillment_partner: formData.fulfillment_partner || null,
        partner_product_id: formData.partner_product_id || null,
        partner_variants: Array.isArray((formData as any).partner_variants)
          ? (formData as any).partner_variants
          : [],
        size_chart_profile: formData.size_chart_profile || null,
        design_family: (formData as any).design_family?.trim() || null,
        vendor_base_cost: formData.vendor_base_cost !== '' ? Number(formData.vendor_base_cost) : null,
        vendor_shipping_cost: formData.vendor_shipping_cost !== '' ? Number(formData.vendor_shipping_cost) : null,
        target_margin_percent: formData.target_margin_percent !== undefined && formData.target_margin_percent !== null
          ? Number(formData.target_margin_percent)
          : 100,
      };

      // Only include pricing validation for non-drafts (backend skips it for drafts, but still send it when publishing)
      if (!savingAsDraft) {
        productData.pricing_validation = createPricingValidationPayload({
          vendorBaseCost: formData.vendor_base_cost !== '' ? Number(formData.vendor_base_cost) : 0,
          vendorShippingCost: formData.vendor_shipping_cost !== '' ? Number(formData.vendor_shipping_cost) : 0,
          targetMarginPercent:
            formData.target_margin_percent !== undefined && formData.target_margin_percent !== null
              ? Number(formData.target_margin_percent)
              : 100,
          sellingPrice: Number(formData.selling_price),
          discountPercentage: Number(formData.discount_percentage) || 0,
          onSale: formData.on_sale,
          saleDiscountPercentage: Number(formData.sale_discount_percentage) || 0,
        });
      }

      // When publishing a draft, flip is_active to true
      if (isDraft) {
        productData.is_active = publishNow ? true : false;
      }

      // Optional single collection assignment
      if (formData.collection_id) {
        productData.collection_id = formData.collection_id;
      } else {
        productData.collection_id = null;
      }

      // Handle main image (URL or file)
      if (mainImageFile) {
        productData.main_image_file = finalMainImageUrl;
      } else {
        productData.main_image_url = finalMainImageUrl;
      }

      if (finalMockupImages.length > 0) {
        productData.mockup_images = finalMockupImages.filter(Boolean);
      }

      // Handle video (URL or file)
      if (videoFile) {
        productData.mockup_video_file = finalVideoUrl;
      } else if (finalVideoUrl) {
        productData.mockup_video_url = finalVideoUrl;
      }

      if(product && product.id) {
        await api.updateProduct(product.id, productData);
      } else {
        await api.createProduct(productData);
      }
      onSave();
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to save product'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (product?.mockup_images && product.mockup_images.length > 0) {
      setMockupImageUrls(product.mockup_images);
      setMockupImagePreviews(product.mockup_images);
      setMockupImageFiles(new Array(product.mockup_images.length).fill(null));
      setMockupImageUseUrl(product.mockup_images.map(url => !url.includes('supabase.co')));
      setMockupImageIsDragging(new Array(product.mockup_images.length).fill(false));
    }
  }, [product]);

  // Load color profiles for hex recognition and swatches; bypass Redis when admin so DB seeds show up immediately.
  useEffect(() => {
    let cancelled = false;
    const loadColors = async () => {
      try {
        const profiles = await api.getColorProfiles({ refresh: true });
        if (!cancelled && Array.isArray(profiles)) {
          setColorProfiles(profiles);
          setDynamicColorProfiles(profiles);
        }
      } catch (error) {
        console.warn('Failed to load color profiles in ProductForm:', error);
      }
    };
    loadColors();
    return () => {
      cancelled = true;
    };
  }, []);

  // When color or profiles change, decide if we need a name for a new hex
  useEffect(() => {
    const value = String(formData.color || '').trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setNeedsColorName(false);
      setCustomColorName('');
      return;
    }
    const hex = value.toUpperCase();
    const known = colorProfiles.some((p) => p.hex.toUpperCase() === hex);
    if (known) {
      setNeedsColorName(false);
      setCustomColorName('');
    } else {
      setNeedsColorName(true);
    }
  }, [formData.color, colorProfiles]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsDesignFamilyLoading(true);
      try {
        const families = await api.getDesignFamilies(designFamilyQuery, 8);
        if (!cancelled) {
          setDesignFamilySuggestions(families);
        }
      } catch (_error) {
        if (!cancelled) {
          setDesignFamilySuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsDesignFamilyLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [designFamilyQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        designFamilyWrapperRef.current &&
        event.target instanceof Node &&
        !designFamilyWrapperRef.current.contains(event.target)
      ) {
        setShowDesignFamilySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {/* Form Section */}
      <Card className="p-6 w-full lg:w-[calc(50%-0.5rem)] flex-shrink-0">
        <h3 className="text-lg font-medium mb-4 text-brand-primary">{product ? 'Edit Product' : 'Add New Product'}</h3>
        <form onSubmit={handleSubmit} className="space-y-0">
          {/* Draft banner */}
          {isDraft && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 text-amber-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">This product is a Draft</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  It is not visible on the storefront. Fill in description, pricing, and category — then click <strong>Save &amp; Publish</strong> to make it live.
                </p>
              </div>
            </div>
          )}
          {/* Section: Category & Collection */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select 
                name="category_id" 
                value={formData.category_id} 
                onChange={handleChange} 
                className="w-full rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Collection <span className="text-xs text-brand-secondary font-normal">(optional)</span>
              </label>
              <select
                name="collection_id"
                value={formData.collection_id || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
              <option value="">No collection</option>
              {collections
                .filter(col => col.isActive !== false)
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map(col => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Title & Description */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <Input 
                name="title" 
                placeholder="Product Title" 
                value={formData.title} 
                onChange={handleChange} 
                required
                className="border-2 border-gray-300 dark:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea 
                name="description" 
                placeholder="Product description" 
                value={formData.description} 
                onChange={handleChange} 
                required 
                className="w-full min-h-[100px] rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-brand-secondary mt-1">
                Start a line with <span className="font-mono">-</span> or <span className="font-mono">•</span> to show it as a bullet point on the product page.
              </p>
            </div>
            <div className="mt-4" ref={designFamilyWrapperRef}>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Design Family
              </label>
              <div className="relative">
                <Input
                  name="design_family"
                  placeholder="e.g., not-normal-tee"
                  value={(formData as any).design_family || ''}
                  onChange={(e) => {
                    handleChange(e);
                    setShowDesignFamilySuggestions(true);
                  }}
                  onFocus={() => setShowDesignFamilySuggestions(true)}
                  autoComplete="off"
                  className="border-2 border-gray-300 dark:border-white/40"
                />
                {showDesignFamilySuggestions && (
                  <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface shadow-lg max-h-56 overflow-auto">
                    {isDesignFamilyLoading ? (
                      <div className="px-3 py-2 text-xs text-brand-secondary">Loading suggestions...</div>
                    ) : designFamilySuggestions.length > 0 ? (
                      designFamilySuggestions.map((family) => (
                        <button
                          key={family}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-brand-primary hover:bg-gray-50 dark:hover:bg-white/5"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData((prev) => ({ ...prev, design_family: family }));
                            setShowDesignFamilySuggestions(false);
                          }}
                        >
                          {family}
                        </button>
                      ))
                    ) : designFamilyQuery ? (
                      <div className="px-3 py-2 text-xs text-brand-secondary">
                        No existing match. This will be saved as a new design family.
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-brand-secondary">
                        Start typing to search existing design families.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-brand-secondary mt-1">
                Use same value across color variants of the same design to link them on product page.
              </p>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Size Chart Profile
              </label>
              <select
                name="size_chart_profile"
                value={(formData as any).size_chart_profile || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Auto detect from product text</option>
                <option value="regular-tee">Regular Fit Tee</option>
                <option value="oversized-tee">Oversized Tee</option>
              </select>
              <p className="text-xs text-brand-secondary mt-1">
                Leave on auto-detect, or set explicitly to avoid keyword ambiguity.
              </p>
            </div>
          </div>

          {/* Section: Fulfillment */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-sm font-semibold text-brand-primary mb-2">
                  Fulfillment Partner
                </label>
                <select 
                  name="fulfillment_partner" 
                  value={formData.fulfillment_partner} 
                  onChange={handleChange} 
                  className="w-full rounded-lg border-2 border-gray-300 dark:border-white/40 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                <option value="">Select a fulfillment partner</option>
                <option value="Qikink">Qikink</option>
                <option value="Printrove">Printrove</option>
              </select>
            </div>

            {formData.fulfillment_partner && (
              <div>
                <label className="block text-sm font-semibold text-brand-primary mb-2">
                  {formData.fulfillment_partner} Product ID/SKU
                </label>
                <Input 
                  name="partner_product_id" 
                  placeholder={`Enter ${formData.fulfillment_partner} product ID or SKU`}
                  value={formData.partner_product_id} 
                  onChange={handleChange}
                  className="border-2 border-gray-300 dark:border-white/40"
                />
                <p className="text-xs text-brand-secondary mt-1">
                  Enter the product ID or SKU from {formData.fulfillment_partner} platform
                </p>
              </div>
            )}

            {/* Partner Variants — read-only mapping table, shown when populated via Printrove sync */}
            {Array.isArray((formData as any).partner_variants) && (formData as any).partner_variants.length > 0 && (
              <div className="sm:col-span-2 w-full min-w-0">
                <label className="block text-sm font-semibold text-brand-primary mb-2">
                  Printrove Variant Mapping
                </label>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full table-fixed text-xs sm:text-sm">
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '58%' }} />
                      <col style={{ width: '32%' }} />
                    </colgroup>
                    <thead className="bg-indigo-500/10 text-brand-primary">
                      <tr>
                        <th className="text-left px-2 sm:px-3 py-2 font-semibold">Size</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-semibold">Printrove SKU</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-semibold">Variant ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((formData as any).partner_variants as PartnerVariant[]).map((pv, i) => (
                        <tr key={`${pv.partner_variant_id}-${i}`} className="border-t border-white/10">
                          <td className="px-2 sm:px-3 py-2 align-middle font-medium text-brand-primary whitespace-nowrap">
                            {pv.size || '—'}
                          </td>
                          <td
                            className="max-w-0 px-2 sm:px-3 py-2 align-middle font-mono text-[11px] sm:text-xs text-brand-secondary truncate"
                            title={pv.partner_sku || undefined}
                          >
                            {pv.partner_sku || '—'}
                          </td>
                          <td className="px-2 sm:px-3 py-2 align-middle font-mono text-brand-secondary whitespace-nowrap tabular-nums">
                            {pv.partner_variant_id || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-brand-secondary mt-1">
                  Auto-populated from Printrove sync. Used at order time to submit the correct variant to Printrove.
                </p>
              </div>
            )}
            </div>
          </div>

          {/* Section: Cost & Pricing */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vendor Base Cost */}
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Vendor Product Cost ({getCurrencySymbol(currency)})
              </label>
              <Input
                name="vendor_base_cost"
                type="number"
                step="0.01"
                placeholder="Base cost from vendor"
                value={formData.vendor_base_cost}
                onChange={handleChange}
                className="border-2 border-gray-300 dark:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Vendor Shipping Cost ({getCurrencySymbol(currency)})
              </label>
              <Input
                name="vendor_shipping_cost"
                type="number"
                step="0.01"
                placeholder="Shipping cost from vendor"
                value={formData.vendor_shipping_cost}
                onChange={handleChange}
                className="border-2 border-gray-300 dark:border-white/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Target Margin (%)
              </label>
            <Input 
              name="target_margin_percent"
              type="number"
              step="0.1"
              min="0"
              max="1000"
              placeholder="100"
              value={formData.target_margin_percent}
              onChange={handleChange}
              className="border-2 border-gray-300 dark:border-white/40"
            />
              <p className="text-xs text-brand-secondary mt-1">
                Default 100% = 2× (vendor cost + vendor shipping)
              </p>
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Selling Price ({getCurrencySymbol(currency)}) <span className="text-red-400">*</span>
              </label>
              <Input 
                name="selling_price" 
                type="number" 
                step="0.01"
                placeholder="35.00" 
                value={formData.selling_price} 
                onChange={handleChange} 
                required
                className="border-2 border-gray-300 dark:border-white/40"
              />
              {/* Suggested price helper */}
              {(() => {
                const base = parseFloat(String(formData.vendor_base_cost || '0')) || 0;
                const ship = parseFloat(String(formData.vendor_shipping_cost || '0')) || 0;
                const margin = parseFloat(String(formData.target_margin_percent ?? 100)) || 0;
                const cost = base + ship;
                if (cost > 0 && margin >= 0) {
                  const suggested = cost * (1 + margin / 100);
                  const displaySuggested = toAnchoredDisplayPrice(suggested);
                  return (
                    <p className="text-xs text-brand-secondary mt-1">
                      Suggested price at {margin.toFixed(1)}% margin: {formatCurrency(displaySuggested, currency, { showDecimals: false })}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Discount Percentage */}
          <div>
            <label className="block text-sm font-semibold text-brand-primary mb-2">
              Discount Percentage (%)
            </label>
            <Input 
              name="discount_percentage" 
              type="number" 
              step="0.01"
              min="0"
              max="100"
              placeholder="30" 
              value={formData.discount_percentage} 
              onChange={handleChange}
              className="border-2 border-gray-300 dark:border-white/40"
            />
            {formData.discount_percentage > 0 && (
              <p className="text-xs text-brand-secondary mt-1">
                {(() => {
                  const discounted = Number(formData.selling_price) * (1 - Number(formData.discount_percentage) / 100);
                  const displayDiscounted = toAnchoredDisplayPrice(discounted);
                  return `Discounted price: ${formatCurrency(displayDiscounted, currency, { showDecimals: false })}`;
                })()}
              </p>
            )}
          </div>

          {/* On Sale Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="on_sale"
                checked={formData.on_sale}
                onChange={handleChange}
                className="w-4 h-4 rounded border-white/20 bg-brand-surface text-brand-accent focus:ring-brand-accent"
              />
              <span className="text-sm font-semibold text-brand-primary">
                Mark as On Sale
              </span>
            </label>
            <p className="text-xs text-brand-secondary mt-1 ml-6">
              Additional sale discount will stack multiplicatively with regular discount
            </p>
          </div>

          {/* Sale Discount Percentage */}
          {formData.on_sale && (
            <div>
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                Sale Discount Percentage (%) <span className="text-red-400">*</span>
              </label>
              <Input 
                name="sale_discount_percentage" 
                type="number" 
                step="0.01"
                min="0"
                max="100"
                placeholder="15" 
                value={formData.sale_discount_percentage} 
                onChange={handleChange}
                required={formData.on_sale}
                className="border-2 border-gray-300 dark:border-white/40"
              />
              {formData.sale_discount_percentage > 0 && (
                <p className="text-xs text-brand-secondary mt-1">
                  {(() => {
                    const regularDiscount = Number(formData.discount_percentage) || 0;
                    const saleDiscount = Number(formData.sale_discount_percentage) || 0;
                    const afterRegular = Number(formData.selling_price) * (1 - regularDiscount / 100);
                    const finalPrice = afterRegular * (1 - saleDiscount / 100);
                    const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
                    const effectiveDiscount = regularDiscount > 0 || saleDiscount > 0
                      ? 100 - (100 - regularDiscount) * (100 - saleDiscount) / 100
                      : 0;
                    return `Final price: ${formatCurrency(displayFinalPrice, currency, { showDecimals: false })} (${effectiveDiscount.toFixed(1)}% total discount)`;
                  })()}
                </p>
              )}
            </div>
          )}
          </div>

          {/* Section: USP & Variants */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-brand-primary mb-2">
                USP Tag
              </label>
              <Input 
                name="usp_tag" 
                placeholder="e.g., 100% organic cotton" 
                value={formData.usp_tag} 
                onChange={handleChange}
                className="border-2 border-gray-300 dark:border-white/40"
              />
            </div>

          {/* Product Variants */}
          <div>
            <label className="block text-sm font-semibold text-brand-primary mb-3">
              Product Variants <span className="text-red-400">*</span>
            </label>
            
            {/* Sizes Section */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-brand-secondary mb-2">
                Sizes <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {availableSizes.map((size) => {
                  const isSelected = formData.sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            sizes: formData.sizes.filter(s => s !== size),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            sizes: [...formData.sizes, size],
                          });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg'
                          : 'bg-brand-surface text-brand-secondary border-white/20 hover:border-purple-500/50 hover:text-brand-primary'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {formData.sizes.length === 0 && (
                <p className="text-xs text-red-400 mt-2">Please select at least one size</p>
              )}
            </div>

            {/* Color (single per listing) */}
            <div>
              <label className="block text-xs font-semibold text-brand-secondary mb-2">
                Color (Name or Hex)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="e.g., Black, Lavender, #E6E6FA"
                  className="flex-1 border-2 border-gray-300 dark:border-white/40 rounded-lg px-3 py-2"
                />
                {formData.color && (
                  <span
                    className="w-8 h-8 rounded-full border border-white/30 flex-shrink-0"
                    style={{ backgroundColor: getCssColorValue(formData.color) }}
                    title={getColorName(formData.color)}
                  />
                )}
              </div>
              <p className="text-xs text-brand-secondary mt-1 italic">
                One listing per color. Name (e.g., Black) or hex (e.g., #000000).
              </p>
              {needsColorName && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-brand-secondary mb-1">
                    New color name for {String(formData.color || '').toUpperCase()}
                  </label>
                  <Input
                    type="text"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    placeholder="e.g., Butter Yellow"
                    className="border-2 border-purple-300 dark:border-purple-400/70 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-brand-secondary mt-1">
                    This hex isn&apos;t in your palette yet. We&apos;ll save this name–hex pair for future swatches.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Section: Main Image */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <label className="block text-sm font-semibold text-brand-primary mb-3">
              Main Image <span className="text-red-400">*</span>
            </label>

            {/* Toggle between URL and File Upload */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setUseMainImageUrl(true);
                  setMainImageFile(null);
                  if (formData.main_image_url) {
                    setMainImagePreview(formData.main_image_url);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  useMainImageUrl
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
                  setUseMainImageUrl(false);
                  setFormData({ ...formData, main_image_url: '' });
                  if (mainImageFile) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setMainImagePreview(reader.result as string);
                    };
                    reader.readAsDataURL(mainImageFile);
                  } else {
                    setMainImagePreview(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !useMainImageUrl
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-brand-surface text-brand-secondary hover:text-brand-primary border border-white/10'
                }`}
              >
                <UploadCloudIcon className="w-4 h-4 inline mr-2" />
                Upload File
              </button>
            </div>

            {/* URL Input */}
            {useMainImageUrl && (
              <div className="space-y-3">
                <Input
                  name="main_image_url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.main_image_url}
                  onChange={handleMainImageUrlChange}
                  className="w-full border-2 border-gray-300 dark:border-white/40"
                  required={!mainImageFile}
                />
                {mainImagePreview && (
                  <div className="relative inline-block">
                    <img 
                      src={mainImagePreview} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-white/20"
                      onError={() => setMainImagePreview(null)}
                    />
                    <button
                      type="button"
                      onClick={removeMainImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* File Upload with Drag & Drop */}
            {!useMainImageUrl && (
              <div
                onDragOver={handleMainImageDragOver}
                onDragLeave={handleMainImageDragLeave}
                onDrop={handleMainImageDrop}
                className="border-2 border-dashed rounded-xl p-6 text-center transition-all border-white/20 bg-brand-surface/50 hover:border-purple-400/50"
              >
                {mainImagePreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img 
                        src={mainImagePreview} 
                        alt="Preview" 
                        className="w-48 h-48 object-cover rounded-lg border-2 border-white/20 mx-auto shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={removeMainImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-brand-primary font-medium">{mainImageFile?.name}</p>
                      <p className="text-xs text-brand-secondary">
                        {(mainImageFile?.size ? mainImageFile.size / 1024 : 0).toFixed(2)} KB
                      </p>
                    </div>
                    <label className="relative inline-block text-sm text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer">
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Choose main product image"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <UploadCloudIcon className="w-12 h-12 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-brand-primary font-medium mb-1">Drag & drop an image here</p>
                      <p className="text-xs text-brand-secondary mb-4">or</p>
                      <label className="relative inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all cursor-pointer">
                        Browse Files
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageFileInput}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                          aria-label="Choose main product image"
                        />
                      </label>
                      <p className="text-xs text-brand-secondary mt-2">Max size: 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Mockup Images */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <label className="block text-sm font-semibold text-brand-primary mb-3">
              Mockup Images ({mockupImageUrls.length}/4)
            </label>
            <div className="space-y-4">
              {mockupImageUrls.map((url, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newUseUrl = [...mockupImageUseUrl];
                        newUseUrl[index] = true;
                        setMockupImageUseUrl(newUseUrl);
                        const newFiles = [...mockupImageFiles];
                        newFiles[index] = null;
                        setMockupImageFiles(newFiles);
                        if (mockupImageUrls[index]) {
                          const newPreviews = [...mockupImagePreviews];
                          newPreviews[index] = mockupImageUrls[index];
                          setMockupImagePreviews(newPreviews);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        mockupImageUseUrl[index]
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-brand-surface text-brand-secondary hover:text-brand-primary border border-white/10'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" />
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newUseUrl = [...mockupImageUseUrl];
                        newUseUrl[index] = false;
                        setMockupImageUseUrl(newUseUrl);
                        const newUrls = [...mockupImageUrls];
                        newUrls[index] = '';
                        setMockupImageUrls(newUrls);
                        if (mockupImageFiles[index]) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const newPreviews = [...mockupImagePreviews];
                            newPreviews[index] = reader.result as string;
                            setMockupImagePreviews(newPreviews);
                          };
                          reader.readAsDataURL(mockupImageFiles[index]!);
                        } else {
                          const newPreviews = [...mockupImagePreviews];
                          newPreviews[index] = '';
                          setMockupImagePreviews(newPreviews);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        !mockupImageUseUrl[index]
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-brand-surface text-brand-secondary hover:text-brand-primary border border-white/10'
                      }`}
                    >
                      <UploadCloudIcon className="w-3 h-3 inline mr-1" />
                      Upload
                    </button>
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={() => handleMockupImageRemoveLegacy(index)}
                      className="p-1.5 ml-auto"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  {mockupImageUseUrl[index] ? (
                    <Input 
                      value={url} 
                      onChange={(e) => handleMockupImageUrlChange(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="text-xs border-2 border-gray-300 dark:border-white/40"
                    />
                  ) : (
                    <div
                      onDragOver={(e) => handleMockupImageDragOver(index, e)}
                      onDragLeave={(e) => handleMockupImageDragLeave(index, e)}
                      onDrop={(e) => handleMockupImageDrop(index, e)}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                        mockupImageIsDragging[index]
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/20 bg-brand-surface/50 hover:border-purple-400/50'
                      }`}
                    >
                      {mockupImagePreviews[index] ? (
                        <div className="space-y-2">
                          <img 
                            src={mockupImagePreviews[index]} 
                            alt={`Mockup ${index + 1}`} 
                            className="w-32 h-32 object-cover rounded-lg border-2 border-white/20 mx-auto"
                          />
                          <p className="text-xs text-brand-primary">{mockupImageFiles[index]?.name}</p>
                          <label
                            htmlFor={`mockup-image-input-${index}`}
                            className="text-xs text-brand-accent hover:text-brand-accent-hover cursor-pointer"
                          >
                            Change
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <UploadCloudIcon className="w-8 h-8 text-purple-400 mx-auto" />
                          <p className="text-xs text-brand-primary">Drag & drop or</p>
                          <label className="relative inline-block text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg cursor-pointer">
                            Browse
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMockupImageFileSelectLegacy(index, file);
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                              aria-label={`Choose mockup image ${index + 1}`}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {mockupImageUrls.length < 4 && (
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={handleMockupImageAdd}
                  className="w-full"
                >
                  <PlusIcon className="w-4 h-4 inline mr-2" />
                  Add Mockup Image
                </Button>
              )}
            </div>
          </div>

          {/* Section: Mockup Video */}
          <div className="pb-6 mb-6 border-b border-gray-200 dark:border-white/20">
            <label className="block text-sm font-semibold text-brand-primary mb-3">
              Mockup Video
            </label>

            {/* Toggle between URL and File Upload */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setUseVideoUrl(true);
                  setVideoFile(null);
                  if (formData.mockup_video_url) {
                    setVideoPreview(formData.mockup_video_url);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  useVideoUrl
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
                  setUseVideoUrl(false);
                  setFormData({ ...formData, mockup_video_url: '' });
                  if (videoFile) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setVideoPreview(reader.result as string);
                    };
                    reader.readAsDataURL(videoFile);
                  } else {
                    setVideoPreview(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !useVideoUrl
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-brand-surface text-brand-secondary hover:text-brand-primary border border-white/10'
                }`}
              >
                <UploadCloudIcon className="w-4 h-4 inline mr-2" />
                Upload File
              </button>
            </div>

            {/* URL Input */}
            {useVideoUrl && (
              <div className="space-y-3">
                <Input
                  name="mockup_video_url"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  value={formData.mockup_video_url}
                  onChange={handleVideoUrlChange}
                  className="w-full border-2 border-gray-300 dark:border-white/40"
                />
                {videoPreview && (
                  <div className="relative inline-block">
                    <video 
                      src={videoPreview} 
                      controls
                      className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-white/20"
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* File Upload with Drag & Drop */}
            {!useVideoUrl && (
              <div
                onDragOver={handleVideoDragOver}
                onDragLeave={handleVideoDragLeave}
                onDrop={handleVideoDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isVideoDragging
                    ? 'border-purple-500 bg-purple-500/10 scale-105'
                    : 'border-white/20 bg-brand-surface/50 hover:border-purple-400/50'
                }`}
              >
                {videoPreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <video 
                        src={videoPreview} 
                        controls
                        className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-white/20 mx-auto shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-brand-primary font-medium">{videoFile?.name}</p>
                      <p className="text-xs text-brand-secondary">
                        {(videoFile?.size ? (videoFile.size / 1024 / 1024).toFixed(2) : 0)} MB
                      </p>
                    </div>
                    <label className="relative inline-block text-sm text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer">
                      Change Video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Choose a different video"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <UploadCloudIcon className="w-12 h-12 text-purple-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-brand-primary font-medium mb-1">Drag & drop a video here</p>
                      <p className="text-xs text-brand-secondary mb-4">or</p>
                      <label
                        className={`relative inline-block px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          (videoPreview || videoFile)
                            ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50 pointer-events-none'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                        }`}
                        title={(videoPreview || videoFile) ? 'Only 1 video allowed. Remove current video to upload a new one.' : 'Browse Files'}
                      >
                        Browse Files
                        {!(videoPreview || videoFile) && (
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideoFileInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                            aria-label="Choose mockup video"
                          />
                        )}
                      </label>
                      <p className="text-xs text-brand-secondary mt-2">
                        Max size: 50MB. Only 1 video allowed.
                        {(videoPreview || videoFile) && (
                          <span className="block mt-1 text-purple-400">Video already selected</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Action Buttons */}
          <div className="flex justify-end gap-2 flex-wrap pt-6 mt-6 border-t-2 border-gray-200 dark:border-white/20">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
            {isDraft && (
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as any, false)}
                className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                {isSubmitting ? 'Saving…' : 'Save Draft'}
              </Button>
            )}
            {isDraft ? (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as any, true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
              >
                {isSubmitting ? 'Publishing…' : '✓ Save & Publish'}
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Preview Section */}
      <div className="lg:sticky lg:top-8 h-fit w-full lg:w-1/2 flex-shrink-0">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-brand-primary mb-1">Live Preview</h3>
          <p className="text-xs text-brand-secondary">See how your product will appear</p>
        </div>
        <div className="w-full flex justify-center">
          <div className="w-full max-w-sm">
            <ProductCardPreview 
              formData={{
                ...formData,
                main_image_url: mainImagePreview || formData.main_image_url || ''
              }} 
              categories={categories} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
