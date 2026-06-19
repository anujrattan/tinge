import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, Collection, PartnerVariant, ProductType } from '../../../types';
import { PosterSizesSection } from './product-form/PosterSizesSection';
import { PosterFulfillmentPricingSection } from './product-form/PosterFulfillmentPricingSection';
import {
  DEFAULT_FULFILLMENT_BY_TYPE,
  getPosterSizesForListing,
  posterSizesComplete,
  usesSizePricing,
} from '../productTypeConfig';
import {
  buildSizePricesPayload,
  minPriceForSizes,
  parseSizePricesMap,
} from '../../../utils/sizePricing';
import { POSTER_SIZES, normalizePosterSizeList } from '../../../utils/sizeSystem';
import { PrintrovePrefill } from './PrintroveSyncModal';
import api from '../../../services/api';
import { Button, Card, Input } from '../../../components/ui';
import {
  FormSection,
  FormField,
  FormRow,
  formSelectClass,
  formTextareaClass,
  formInputClass,
  togglePillClass,
  chipSelected,
  chipUnselected,
  toggleBtnActive,
  toggleBtnInactive,
} from './product-form/formUi';
import { UploadCloudIcon, LinkIcon, XIcon, PlusIcon } from '../../../components/icons';
import { ProductCardPreview } from '../../../components/ProductCardPreview';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';
import { useApp } from '../../../context/AppContext';
import { getCssColorValue, getColorName, setDynamicColorProfiles } from '../../../utils/colorUtils';
import { createPricingValidationPayload, toAnchoredDisplayPrice } from '../../../utils/pricing';
import { normalizeSizeList, PREFERRED_SIZES } from '../../../utils/sizeSystem';

export const ProductFormInner: React.FC<{
  productType: ProductType;
  product?: Product | null;
  prefill?: PrintrovePrefill | null;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
}> = ({ productType, product, prefill, onSave, onCancel, categories, collections }) => {
  const { currency, isAdmin } = useApp();
  const designFamilyWrapperRef = useRef<HTMLDivElement | null>(null);
  const colorWrapperRef = useRef<HTMLDivElement | null>(null);
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
    size_prices: parseSizePricesMap(
      product?.variants?.size_prices,
      prefill?.sizes || product?.variants?.sizes || [],
    ),
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
  const [showColorSuggestions, setShowColorSuggestions] = useState(false);

  const isAddListing = !product?.id;
  const enableColorTypeahead = isAdmin && isAddListing;
  const colorQuery = String(formData.color || '').trim();
  const colorSuggestions = enableColorTypeahead
    ? colorProfiles
        .filter((profile) => {
          if (!colorQuery) return true;
          const q = colorQuery.toLowerCase();
          return (
            profile.name.toLowerCase().includes(q) ||
            profile.hex.toLowerCase().includes(q)
          );
        })
        .slice(0, 12)
    : [];

  const isPoster = productType === 'poster';
  const sizePricingEnabled = usesSizePricing(productType);
  const filteredCategories = categories.filter(
    (c) => (c.product_type || 'apparel') === productType,
  );

  useEffect(() => {
    if (product?.id || !isPoster) return;
    setFormData((prev: typeof formData) => ({
      ...prev,
      sizes: prev.sizes?.length ? prev.sizes : getPosterSizesForListing(),
      size_prices: { ...(prev.size_prices || {}) },
      fulfillment_partner: prev.fulfillment_partner || DEFAULT_FULFILLMENT_BY_TYPE.poster,
      partner_variants:
        Array.isArray(prev.partner_variants) && prev.partner_variants.length > 0
          ? prev.partner_variants
          : POSTER_SIZES.map((size) => ({
              size,
              partner_variant_id: '',
              partner_sku: '',
            })),
    }));
    const posterCat = categories.find((c) => c.product_type === 'poster');
    if (posterCat && !categories.some((c) => c.id === formData.category_id && c.product_type === 'poster')) {
      setFormData((prev: typeof formData) => ({ ...prev, category_id: posterCat.id }));
    }
  }, [isPoster, product?.id, categories]);

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
      alert(isPoster ? 'Please include poster sizes' : 'Please add at least one size variant');
      return;
    }

    if (!savingAsDraft && isPoster && !posterSizesComplete(formData.sizes)) {
      alert('Metal posters must include both sizes: 8 × 11.7 in and 11.7 × 15.7 in.');
      return;
    }

    const rawColor = String(formData.color || '').trim();
    const isHexColor = /^#[0-9A-Fa-f]{6}$/.test(rawColor);
    if (!isPoster && needsColorName && isHexColor && !customColorName.trim()) {
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
      if (!isPoster && needsColorName && isHexColor && customColorName.trim()) {
        try {
          await api.upsertColorProfile(customColorName.trim(), rawColor.toUpperCase());
        } catch (colorError: any) {
          throw new Error(colorError.message || 'Failed to save new color profile. Please try again.');
        }
      }

      const savingAsDraft = isDraft && !publishNow;

      const sizesArray = isPoster
        ? normalizePosterSizeList(
            Array.isArray(formData.sizes) ? formData.sizes.filter((s) => s && s.trim()) : [],
          )
        : normalizeSizeList(
            Array.isArray(formData.sizes) ? formData.sizes.filter((s) => s && s.trim()) : [],
          );

      const publishSizes = isPoster && !savingAsDraft ? [...POSTER_SIZES] : sizesArray;

      if (!savingAsDraft && sizePricingEnabled) {
        const missingPrice = publishSizes.filter(
          (s) => !(Number((formData as any).size_prices?.[s]) > 0),
        );
        if (missingPrice.length > 0) {
          alert('Enter a selling price for each included size in the size pricing table.');
          setIsSubmitting(false);
          return;
        }
      }

      const sizePricesForApi = sizePricingEnabled
        ? buildSizePricesPayload(publishSizes, (formData as any).size_prices || {})
        : undefined;
      const listingSellingPrice = sizePricesForApi
        ? minPriceForSizes(publishSizes, (formData as any).size_prices || {}, Number(formData.selling_price) || 0)
        : Number(formData.selling_price) || 0;

      const productData: any = {
        category_id: formData.category_id,
        title: formData.title,
        description: formData.description || '',
        selling_price: listingSellingPrice,
        discount_percentage: formData.discount_percentage > 0 ? Number(formData.discount_percentage) : null,
        on_sale: formData.on_sale || false,
        sale_discount_percentage: formData.on_sale && formData.sale_discount_percentage > 0 ? Number(formData.sale_discount_percentage) : null,
        usp_tag: formData.usp_tag || null,
        sizes: publishSizes,
        ...(sizePricesForApi ? { size_prices: sizePricesForApi } : {}),
        color: isPoster
          ? null
          : formData.color && String(formData.color).trim()
            ? String(formData.color).trim()
            : null,
        fulfillment_partner: formData.fulfillment_partner || null,
        partner_product_id: formData.partner_product_id || null,
        partner_variants: Array.isArray((formData as any).partner_variants)
          ? (formData as any).partner_variants
          : [],
        size_chart_profile: isPoster ? null : formData.size_chart_profile || null,
        design_family: isPoster ? null : (formData as any).design_family?.trim() || null,
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
          sellingPrice: listingSellingPrice,
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
      if (!(event.target instanceof Node)) return;
      if (
        designFamilyWrapperRef.current &&
        !designFamilyWrapperRef.current.contains(event.target)
      ) {
        setShowDesignFamilySuggestions(false);
      }
      if (
        colorWrapperRef.current &&
        !colorWrapperRef.current.contains(event.target)
      ) {
        setShowColorSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Form Section */}
      <Card className="p-6 md:p-8 w-full lg:w-[calc(50%-0.5rem)] flex-shrink-0 border-gray-200/80 dark:border-white/10">
        <div className="mb-8">
          <h3 className="font-playfair text-xl md:text-2xl font-medium text-brand-primary">
            {product ? 'Edit Product' : isPoster ? 'Add Metal Poster' : 'Add Apparel Product'}
          </h3>
          <p className="mt-1.5 text-sm text-brand-secondary leading-relaxed">
            {isPoster
              ? 'Configure poster sizes, per-size pricing, and fulfillment details.'
              : 'Fill in listing details, pricing, variants, and media for this apparel product.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
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
          <FormSection
            title="Classification"
            description="Choose where this product appears in your catalog."
          >
            <FormRow>
              <FormField label="Category" required>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className={formSelectClass}
                  required
                >
                  <option value="">Select a category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Collection" hint="Optional — group related drops together.">
                <select
                  name="collection_id"
                  value={formData.collection_id || ''}
                  onChange={handleChange}
                  className={formSelectClass}
                >
                  <option value="">No collection</option>
                  {collections
                    .filter((col) => col.isActive !== false)
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          {/* Section: Title & Description */}
          <FormSection title="Listing copy" description="Title and description shown on the product page.">
            <FormField label="Title" required>
              <Input
                name="title"
                placeholder="Product Title"
                value={formData.title}
                onChange={handleChange}
                required
                className={formInputClass}
              />
            </FormField>
            <FormField
              label="Description"
              required
              hint={
                <>
                  Start a line with <span className="font-mono">-</span> or{' '}
                  <span className="font-mono">•</span> to show it as a bullet point on the product page.
                </>
              }
            >
              <textarea
                name="description"
                placeholder="Product description"
                value={formData.description}
                onChange={handleChange}
                required
                className={formTextareaClass}
              />
            </FormField>
            {!isPoster && (
              <FormRow>
                <FormField
                  label="Design Family"
                  hint="Link color variants of the same design on the product page."
                >
                  <div className="relative" ref={designFamilyWrapperRef}>
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
                      className={formInputClass}
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
                </FormField>
                <FormField
                  label="Size Chart Profile"
                  hint="Leave on auto-detect, or set explicitly to avoid keyword ambiguity."
                >
                  <select
                    name="size_chart_profile"
                    value={(formData as any).size_chart_profile || ''}
                    onChange={handleChange}
                    className={formSelectClass}
                  >
                    <option value="">Auto detect from product text</option>
                    <option value="regular-tee">Regular Fit Tee</option>
                    <option value="oversized-tee">Oversized Tee</option>
                  </select>
                </FormField>
              </FormRow>
            )}
          </FormSection>

          {isPoster && (
          <FormSection
            title="Sizes on this listing"
            description="Turn each size on if it should appear on the product page. Shoppers choose one size at checkout. Publishing requires both sizes."
          >
            <PosterSizesSection formData={formData} setFormData={setFormData} />
          </FormSection>
          )}

          {/* Section: Fulfillment (apparel) */}
          {!isPoster && (
          <FormSection
            title="Fulfillment"
            description="Connect this listing to your print-on-demand partner."
          >
            <FormRow>
              <FormField label="Fulfillment Partner">
                <select
                  name="fulfillment_partner"
                  value={formData.fulfillment_partner}
                  onChange={handleChange}
                  className={formSelectClass}
                >
                  <option value="">Select a fulfillment partner</option>
                  <option value="Qikink">Qikink</option>
                  <option value="Printrove">Printrove</option>
                </select>
              </FormField>
              {formData.fulfillment_partner ? (
                <FormField
                  label={`${formData.fulfillment_partner} Product ID / SKU`}
                  hint={`Enter the product ID or SKU from ${formData.fulfillment_partner}.`}
                >
                  <Input
                    name="partner_product_id"
                    placeholder={`Enter ${formData.fulfillment_partner} product ID or SKU`}
                    value={formData.partner_product_id}
                    onChange={handleChange}
                    className={formInputClass}
                  />
                </FormField>
              ) : (
                <div className="hidden sm:block" aria-hidden />
              )}
            </FormRow>

            {Array.isArray((formData as any).partner_variants) && (formData as any).partner_variants.length > 0 && (
              <FormField label="Printrove Variant Mapping" hint="Auto-populated from Printrove sync. Used at order time.">
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
                  <table className="w-full table-fixed text-xs sm:text-sm">
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '58%' }} />
                      <col style={{ width: '32%' }} />
                    </colgroup>
                    <thead className="bg-brand-accent/10 text-brand-primary">
                      <tr>
                        <th className="text-left px-2 sm:px-3 py-2 font-semibold">Size</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-semibold">Printrove SKU</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-semibold">Variant ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((formData as any).partner_variants as PartnerVariant[]).map((pv, i) => (
                        <tr key={`${pv.partner_variant_id}-${i}`} className="border-t border-gray-200/80 dark:border-white/10">
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
              </FormField>
            )}
          </FormSection>
          )}

          {/* Section: Cost & Pricing */}
          <FormSection title="Pricing" description="Vendor costs, margin, and customer-facing price.">
            <FormRow>
              <FormField label={`Vendor Product Cost (${getCurrencySymbol(currency)})`}>
                <Input
                  name="vendor_base_cost"
                  type="number"
                  step="0.01"
                  placeholder="Base cost from vendor"
                  value={formData.vendor_base_cost}
                  onChange={handleChange}
                  className={formInputClass}
                />
              </FormField>
              <FormField label={`Vendor Shipping Cost (${getCurrencySymbol(currency)})`}>
                <Input
                  name="vendor_shipping_cost"
                  type="number"
                  step="0.01"
                  placeholder="Shipping cost from vendor"
                  value={formData.vendor_shipping_cost}
                  onChange={handleChange}
                  className={formInputClass}
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Target Margin (%)" hint="Default 100% = 2× (vendor cost + vendor shipping)">
                <Input
                  name="target_margin_percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1000"
                  placeholder="100"
                  value={formData.target_margin_percent}
                  onChange={handleChange}
                  className={formInputClass}
                />
              </FormField>
              <FormField
                label={
                  <>
                    {sizePricingEnabled ? 'List price (from)' : 'Selling Price'} ({getCurrencySymbol(currency)})
                  </>
                }
                required={!sizePricingEnabled}
                hint={
                  sizePricingEnabled
                    ? isPoster
                      ? 'Auto-set to the lowest size price. Enter per-size prices in the fulfillment section below.'
                      : 'Auto-set to the lowest size price. Enter prices per size in the variant table below.'
                    : (() => {
                        const base = parseFloat(String(formData.vendor_base_cost || '0')) || 0;
                        const ship = parseFloat(String(formData.vendor_shipping_cost || '0')) || 0;
                        const margin = parseFloat(String(formData.target_margin_percent ?? 100)) || 0;
                        const cost = base + ship;
                        if (cost > 0 && margin >= 0) {
                          const suggested = cost * (1 + margin / 100);
                          const displaySuggested = toAnchoredDisplayPrice(suggested);
                          return `Suggested at ${margin.toFixed(1)}% margin: ${formatCurrency(displaySuggested, currency, { showDecimals: false })}`;
                        }
                        return undefined;
                      })()
                }
              >
                <Input
                  name="selling_price"
                  type="number"
                  step="0.01"
                  placeholder="35.00"
                  value={formData.selling_price}
                  onChange={handleChange}
                  required={!sizePricingEnabled}
                  readOnly={sizePricingEnabled}
                  className={`${formInputClass} ${sizePricingEnabled ? 'opacity-80 cursor-not-allowed' : ''}`}
                />
              </FormField>
            </FormRow>

            <FormRow className="items-end">
              <FormField
                label="Discount Percentage (%)"
                hint={
                  formData.discount_percentage > 0
                    ? (() => {
                        const discounted =
                          Number(formData.selling_price) * (1 - Number(formData.discount_percentage) / 100);
                        const displayDiscounted = toAnchoredDisplayPrice(discounted);
                        return `Discounted price: ${formatCurrency(displayDiscounted, currency, { showDecimals: false })}`;
                      })()
                    : undefined
                }
              >
                <Input
                  name="discount_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="30"
                  value={formData.discount_percentage}
                  onChange={handleChange}
                  className={formInputClass}
                />
              </FormField>
              <div className="flex flex-col justify-end gap-2 pb-0.5">
                <label className="flex items-center gap-3 cursor-pointer min-h-[42px] px-4 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-brand-surface">
                  <input
                    type="checkbox"
                    name="on_sale"
                    checked={formData.on_sale}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/30 text-brand-accent focus:ring-brand-accent"
                  />
                  <span className="text-sm font-medium text-brand-primary">Mark as On Sale</span>
                </label>
                <p className="text-xs text-brand-secondary leading-relaxed">
                  Sale discount stacks multiplicatively with regular discount.
                </p>
              </div>
            </FormRow>

            {formData.on_sale && (
              <FormField
                label="Sale Discount Percentage (%)"
                required
                hint={
                  formData.sale_discount_percentage > 0
                    ? (() => {
                        const regularDiscount = Number(formData.discount_percentage) || 0;
                        const saleDiscount = Number(formData.sale_discount_percentage) || 0;
                        const afterRegular = Number(formData.selling_price) * (1 - regularDiscount / 100);
                        const finalPrice = afterRegular * (1 - saleDiscount / 100);
                        const displayFinalPrice = toAnchoredDisplayPrice(finalPrice);
                        const effectiveDiscount =
                          regularDiscount > 0 || saleDiscount > 0
                            ? 100 - ((100 - regularDiscount) * (100 - saleDiscount)) / 100
                            : 0;
                        return `Final price: ${formatCurrency(displayFinalPrice, currency, { showDecimals: false })} (${effectiveDiscount.toFixed(1)}% total discount)`;
                      })()
                    : undefined
                }
              >
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
                  className={formInputClass}
                />
              </FormField>
            )}
          </FormSection>

          {isPoster && (
          <FormSection
            title="Fulfillment & size pricing"
            description="Partner details and per-size selling prices. List price above auto-updates from the lowest size price."
          >
            <PosterFulfillmentPricingSection
              formData={formData}
              setFormData={setFormData}
              onFieldChange={handleChange}
            />
          </FormSection>
          )}

          {/* Section: USP & Variants */}
          <FormSection
            title={isPoster ? 'USP tag' : 'Variants & USP'}
            description={
              isPoster
                ? 'Short highlight shown on the product card.'
                : 'Sizes, color, and a short selling point for the card.'
            }
          >
            <FormField label="USP Tag" hint="e.g. Premium metal print, fade-resistant finish.">
              <Input
                name="usp_tag"
                placeholder="e.g., Premium metal print"
                value={formData.usp_tag}
                onChange={handleChange}
                className={formInputClass}
              />
            </FormField>

          {/* Product Variants (apparel only) */}
          {!isPoster && (
          <div className="space-y-5">
            <FormField label="Sizes" required>
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
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        isSelected ? chipSelected : chipUnselected
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
            </FormField>

            <FormField
              label="Color (Name or Hex)"
              hint={
                enableColorTypeahead
                  ? 'Search the palette or type a custom name/hex. One listing per color.'
                  : 'One listing per color. Name (e.g., Black) or hex (e.g., #000000).'
              }
            >
            <div ref={enableColorTypeahead ? colorWrapperRef : undefined}>
              <div className="flex items-center gap-2">
                <div className={enableColorTypeahead ? 'relative flex-1 min-w-0' : 'contents'}>
                  <Input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={(e) => {
                      handleChange(e);
                      if (enableColorTypeahead) setShowColorSuggestions(true);
                    }}
                    onFocus={() => {
                      if (enableColorTypeahead) setShowColorSuggestions(true);
                    }}
                    autoComplete="off"
                    placeholder="e.g., Black, Sky Blue, #1BCEFA"
                    className={`${enableColorTypeahead ? 'w-full' : 'flex-1'} ${formInputClass}`}
                  />
                  {enableColorTypeahead && showColorSuggestions && (
                    <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface shadow-lg max-h-56 overflow-auto">
                      {colorProfiles.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-brand-secondary">
                          Loading color palette…
                        </div>
                      ) : colorSuggestions.length > 0 ? (
                        colorSuggestions.map((profile) => (
                          <button
                            key={`${profile.name}-${profile.hex}`}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm text-brand-primary hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData((prev) => ({ ...prev, color: profile.name }));
                              setShowColorSuggestions(false);
                            }}
                          >
                            <span
                              className="w-5 h-5 rounded-full border border-white/30 flex-shrink-0"
                              style={{ backgroundColor: profile.hex }}
                              aria-hidden
                            />
                            <span className="font-medium">{profile.name}</span>
                            <span className="text-xs text-brand-secondary font-mono ml-auto">
                              {profile.hex}
                            </span>
                          </button>
                        ))
                      ) : colorQuery ? (
                        <div className="px-3 py-2 text-xs text-brand-secondary">
                          No palette match. Enter a name or hex — new hex colors can be saved on submit.
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-xs text-brand-secondary">
                          Start typing to search the color palette.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {formData.color && (
                  <span
                    className="w-8 h-8 rounded-full border border-white/30 flex-shrink-0"
                    style={{ backgroundColor: getCssColorValue(formData.color) }}
                    title={getColorName(formData.color)}
                  />
                )}
              </div>
              {needsColorName && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-brand-secondary">
                    New color name for {String(formData.color || '').toUpperCase()}
                  </label>
                  <Input
                    type="text"
                    value={customColorName}
                    onChange={(e) => setCustomColorName(e.target.value)}
                    placeholder="e.g., Butter Yellow"
                    className={`${formInputClass} border-brand-accent/30`}
                  />
                  <p className="text-[11px] text-brand-secondary">
                    This hex isn&apos;t in your palette yet. We&apos;ll save this name–hex pair for future swatches.
                  </p>
                </div>
              )}
            </div>
            </FormField>
          </div>
          )}
          </FormSection>

          {/* Section: Main Image */}
          <FormSection title="Main image" description="Primary image shown on listing cards and the product page.">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseMainImageUrl(true);
                  setMainImageFile(null);
                  if (formData.main_image_url) {
                    setMainImagePreview(formData.main_image_url);
                  }
                }}
                className={togglePillClass(useMainImageUrl)}
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
                className={togglePillClass(!useMainImageUrl)}
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
                className="border-2 border-dashed rounded-xl p-6 text-center transition-all border-gray-200 dark:border-white/20 bg-white/50 dark:bg-brand-surface/50 hover:border-brand-accent/50"
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
                      <div className="p-4 rounded-full bg-brand-accent/10">
                        <UploadCloudIcon className="w-12 h-12 text-brand-accent" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-brand-primary font-medium mb-1">Drag & drop an image here</p>
                      <p className="text-xs text-brand-secondary mb-4">or</p>
                      <label className="relative inline-block px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all cursor-pointer">
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
          </FormSection>

          {/* Section: Mockup Images */}
          <FormSection title={`Mockup images (${mockupImageUrls.length}/4)`} description="Optional lifestyle or detail shots for the product page.">
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
                          ? toggleBtnActive
                          : toggleBtnInactive
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
                          ? toggleBtnActive
                          : toggleBtnInactive
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
                          ? 'border-brand-accent bg-brand-accent/10'
                          : 'border-gray-200 dark:border-white/20 bg-white/50 dark:bg-brand-surface/50 hover:border-brand-accent/50'
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
                          <UploadCloudIcon className="w-8 h-8 text-brand-accent mx-auto" />
                          <p className="text-xs text-brand-primary">Drag & drop or</p>
                          <label className="relative inline-block text-xs px-3 py-1 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg cursor-pointer">
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
          </FormSection>

          {/* Section: Mockup Video */}
          <FormSection title="Mockup video" description="Optional product video for the gallery. Max 50MB, one file.">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseVideoUrl(true);
                  setVideoFile(null);
                  if (formData.mockup_video_url) {
                    setVideoPreview(formData.mockup_video_url);
                  }
                }}
                className={togglePillClass(useVideoUrl)}
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
                className={togglePillClass(!useVideoUrl)}
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
                    ? 'border-brand-accent bg-brand-accent/10 scale-[1.01]'
                    : 'border-gray-200 dark:border-white/20 bg-white/50 dark:bg-brand-surface/50 hover:border-brand-accent/50'
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
                      <div className="p-4 rounded-full bg-brand-accent/10">
                        <UploadCloudIcon className="w-12 h-12 text-brand-accent" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-brand-primary font-medium mb-1">Drag & drop a video here</p>
                      <p className="text-xs text-brand-secondary mb-4">or</p>
                      <label
                        className={`relative inline-block px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          (videoPreview || videoFile)
                            ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50 pointer-events-none'
                            : 'bg-brand-accent hover:bg-brand-accent-hover text-white hover:shadow-lg'
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
                          <span className="block mt-1 text-brand-accent">Video already selected</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 flex-wrap pt-2 border-t border-gray-200/80 dark:border-white/10">
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
              >
                {isSubmitting ? 'Publishing…' : 'Save & Publish'}
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
        <div className="mb-5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-5">
          <h3 className="font-playfair text-lg font-medium text-brand-primary mb-1">Live Preview</h3>
          <p className="text-xs text-brand-secondary leading-relaxed">See how your product will appear on the storefront.</p>
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
