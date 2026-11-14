import React, { useMemo, useState } from 'react';
import { Product, Category, Collection, ArtMaterial } from '../../../types';
import api from '../../../services/api';
import { Button, Card, Input } from '../../../components/ui';
import {
  FormSection,
  FormField,
  FormRow,
  formSelectClass,
  formTextareaClass,
  formInputClass,
  chipSelected,
  chipUnselected,
} from './product-form/formUi';
import { MATERIAL_OPTIONS, getSizesForMaterial } from '../productTypeConfig';
import {
  buildSizePricesPayload,
  minPriceForSizes,
  parseSizePricesMap,
} from '../../../utils/sizePricing';
import { formatCurrency } from '../../../utils/currency';
import { useApp } from '../../../context/AppContext';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ArtProductForm: React.FC<{
  product?: Product | null;
  onSave: () => void;
  onCancel: () => void;
  categories: Category[];
  collections: Collection[];
}> = ({ product, onSave, onCancel, categories, collections }) => {
  const { currency } = useApp();
  const initialMaterial = (product?.material || 'framed_acp') as ArtMaterial;
  const initialSizes =
    product?.variants?.sizes?.length
      ? product.variants.sizes
      : getSizesForMaterial(initialMaterial);

  const [formData, setFormData] = useState({
    title: product?.title || product?.name || '',
    description: product?.description || '',
    material: initialMaterial,
    category_id: product?.category_id || categories[0]?.id || '',
    collection_id: product?.collection_id || '',
    selling_price: product?.selling_price || product?.price || 0,
    discount_percentage: product?.discount_percentage || 0,
    on_sale: product?.on_sale || false,
    sale_discount_percentage: product?.sale_discount_percentage || 0,
    usp_tag: product?.usp_tag || '',
    is_featured: product?.is_featured === true,
    design_family: product?.design_family || '',
    main_image_url: product?.main_image_url || product?.imageUrl || '',
    sizes: initialSizes,
    size_prices: parseSizePricesMap(product?.variants?.size_prices, initialSizes),
  });
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(
    product?.main_image_url || product?.imageUrl || null,
  );
  const [mockupUrls, setMockupUrls] = useState<string[]>(product?.mockup_images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingAsDraft, setSavingAsDraft] = useState(false);

  const listingMin = useMemo(
    () => minPriceForSizes(formData.sizes, formData.size_prices) || Number(formData.selling_price) || 0,
    [formData.sizes, formData.size_prices, formData.selling_price],
  );

  const setMaterial = (material: ArtMaterial) => {
    const sizes = getSizesForMaterial(material);
    setFormData((prev) => ({
      ...prev,
      material,
      sizes,
      size_prices: Object.fromEntries(
        sizes.map((s) => [s, prev.size_prices?.[s] ?? 0]),
      ),
    }));
  };

  const toggleSize = (size: string) => {
    setFormData((prev) => {
      const has = prev.sizes.includes(size);
      const sizes = has ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size];
      const size_prices = { ...prev.size_prices };
      if (!has && size_prices[size] == null) size_prices[size] = 0;
      if (has) delete size_prices[size];
      return { ...prev, sizes, size_prices };
    });
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    if (!formData.category_id) {
      alert('Category is required');
      return;
    }
    if (!formData.sizes.length) {
      alert('Pick at least one size');
      return;
    }
    if (!asDraft) {
      const missing = formData.sizes.filter((s) => !(Number(formData.size_prices?.[s]) > 0));
      if (missing.length) {
        alert(`Enter a price for: ${missing.join(', ')}`);
        return;
      }
      if (!formData.main_image_url && !mainImageFile) {
        alert('Main image is required to publish');
        return;
      }
    }

    setIsSubmitting(true);
    setSavingAsDraft(asDraft);
    try {
      let main_image_url = formData.main_image_url;
      let main_image_file: string | undefined;
      if (mainImageFile) {
        main_image_file = await fileToDataUrl(mainImageFile);
        main_image_url = undefined as any;
      }

      const size_prices = buildSizePricesPayload(formData.sizes, formData.size_prices);
      const selling_price =
        minPriceForSizes(formData.sizes, formData.size_prices) || Number(formData.selling_price) || 0;

      const payload: any = {
        category_id: formData.category_id,
        collection_id: formData.collection_id || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        material: formData.material,
        selling_price,
        discount_percentage: Number(formData.discount_percentage) || 0,
        on_sale: Boolean(formData.on_sale),
        sale_discount_percentage: Number(formData.sale_discount_percentage) || 0,
        usp_tag: formData.usp_tag || null,
        is_featured: Boolean(formData.is_featured),
        design_family: formData.design_family?.trim() || null,
        sizes: formData.sizes,
        size_prices,
        mockup_images: mockupUrls,
        is_active: !asDraft,
      };
      if (main_image_file) payload.main_image_file = main_image_file;
      else payload.main_image_url = main_image_url;

      if (product?.id) {
        await api.updateProduct(product.id, payload);
      } else {
        await api.createProduct(payload);
      }
      onSave();
    } catch (error: any) {
      alert(error?.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
      setSavingAsDraft(false);
    }
  };

  const presets = getSizesForMaterial(formData.material);

  return (
    <Card className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand-secondary">
            {product?.id ? 'Edit artwork listing' : 'New artwork listing'}
          </h2>
          <p className="text-sm text-brand-muted mt-1">
            One listing = one artwork designed for one material. Customer picks size only.
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <FormSection title="Artwork" description="Title, material, and merchandising.">
        <FormField label="Title" required>
          <Input
            className={formInputClass}
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="Horizon Line — Framed ACP"
          />
        </FormField>
        <FormField label="Description">
          <textarea
            className={formTextareaClass}
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          />
        </FormField>
        <FormField label="Material" required hint="Fixed for this listing — not customer-selectable.">
          <select
            className={formSelectClass}
            value={formData.material}
            onChange={(e) => setMaterial(e.target.value as ArtMaterial)}
          >
            {MATERIAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormRow>
          <FormField label="Category" required>
            <select
              className={formSelectClass}
              value={formData.category_id}
              onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Collection">
            <select
              className={formSelectClass}
              value={formData.collection_id}
              onChange={(e) => setFormData((p) => ({ ...p, collection_id: e.target.value }))}
            >
              <option value="">None</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="USP tag">
            <Input
              className={formInputClass}
              value={formData.usp_tag}
              onChange={(e) => setFormData((p) => ({ ...p, usp_tag: e.target.value }))}
            />
          </FormField>
          <FormField label="Design family" hint="Optional link across materials of the same art.">
            <Input
              className={formInputClass}
              value={formData.design_family}
              onChange={(e) => setFormData((p) => ({ ...p, design_family: e.target.value }))}
            />
          </FormField>
        </FormRow>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.is_featured}
            onChange={(e) => setFormData((p) => ({ ...p, is_featured: e.target.checked }))}
          />
          Featured art
        </label>
      </FormSection>

      <FormSection title="Sizes & prices" description={`Presets for ${formData.material.replace('_', ' ')}.`}>
        <div className="flex flex-wrap gap-2">
          {presets.map((size) => {
            const selected = formData.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                className={selected ? chipSelected : chipUnselected}
                onClick={() => toggleSize(size)}
              >
                {size}
              </button>
            );
          })}
        </div>
        <div className="space-y-3 mt-4">
          {formData.sizes.map((size) => (
            <FormRow key={size}>
              <FormField label={size}>
                <Input
                  type="number"
                  min={0}
                  className={formInputClass}
                  value={formData.size_prices?.[size] ?? ''}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      size_prices: {
                        ...p.size_prices,
                        [size]: Number(e.target.value),
                      },
                    }))
                  }
                />
              </FormField>
            </FormRow>
          ))}
        </div>
        <p className="text-sm text-brand-muted">
          Listing price (min size): {formatCurrency(listingMin, currency)}
        </p>
      </FormSection>

      <FormSection title="Media">
        <FormField label="Main image">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setMainImageFile(file);
              if (file) setMainImagePreview(URL.createObjectURL(file));
            }}
          />
          {mainImagePreview && (
            <img src={mainImagePreview} alt="" className="mt-3 h-40 object-cover rounded-lg" />
          )}
          <Input
            className={`${formInputClass} mt-2`}
            placeholder="Or paste image URL"
            value={formData.main_image_url}
            onChange={(e) => {
              setFormData((p) => ({ ...p, main_image_url: e.target.value }));
              setMainImagePreview(e.target.value || null);
              setMainImageFile(null);
            }}
          />
        </FormField>
        <FormField label="Mockup image URLs" hint="One URL per line">
          <textarea
            className={formTextareaClass}
            rows={3}
            value={mockupUrls.join('\n')}
            onChange={(e) =>
              setMockupUrls(
                e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </FormField>
      </FormSection>

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
        >
          {isSubmitting && savingAsDraft ? 'Saving…' : 'Save draft'}
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
          {isSubmitting && !savingAsDraft ? 'Publishing…' : product?.id ? 'Update & publish' : 'Publish'}
        </Button>
      </div>
    </Card>
  );
};
