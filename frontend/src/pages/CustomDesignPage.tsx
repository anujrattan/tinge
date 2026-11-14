import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';
import { RoomMockupPreview, renderRoomMockupBlob } from '../components/RoomMockupPreview';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';
import type { ArtMaterial } from '../types';
import {
  CheckCircleIcon,
  UploadCloudIcon,
  SparklesIcon,
  ArrowRightIcon,
  TrashIcon,
} from '../components/icons';

type MaterialOption = {
  id: ArtMaterial;
  slug: string;
  name: string;
  summary: string;
  finishNote: string;
  sizes: Array<{ label: string; price: number; hint: string }>;
};

const MATERIALS: MaterialOption[] = [
  {
    id: 'framed_acp',
    slug: 'framed-acp',
    name: 'Framed ACP',
    summary: 'UV print on aluminium composite panel with a matte black gallery frame.',
    finishNote: 'Rigid, flat, ready to hang',
    sizes: [
      { label: '3 × 2 FT', price: 6999, hint: 'Desk / study wall' },
      { label: '4 × 2 FT', price: 8999, hint: 'Standard bedroom / hallway' },
      { label: '4 × 4 FT', price: 12999, hint: 'Statement square' },
      { label: '6 × 4 FT', price: 18999, hint: 'Above a full sofa' },
    ],
  },
  {
    id: 'canvas',
    slug: 'canvas',
    name: 'Canvas',
    summary: 'Archival print on woven gallery-grade canvas with wrapped edges.',
    finishNote: 'Warm matte textile texture',
    sizes: [
      { label: '3 × 2 FT', price: 3999, hint: 'Desk / reading nook' },
      { label: '4 × 2 FT', price: 5499, hint: 'Standard wall' },
      { label: '4 × 4 FT', price: 7999, hint: 'Wide living wall' },
    ],
  },
  {
    id: 'sunboard',
    slug: 'sunboard',
    name: 'Sunboard',
    summary: 'Lightweight rigid foam panel. Easy to mount with tape or screws.',
    finishNote: 'Frameless crisp edges',
    sizes: [
      { label: '3 × 2 FT', price: 1799, hint: 'Studio / dorm / desk' },
      { label: '4 × 2 FT', price: 2499, hint: 'Medium wall' },
    ],
  },
  {
    id: 'neon',
    slug: 'neon',
    name: 'Neon',
    summary: 'Custom LED neon sign or glowing wall piece confirmed before production.',
    finishNote: 'Includes power adapter',
    sizes: [
      { label: '2 × 1 FT', price: 8999, hint: 'Desk / bar shelf' },
      { label: '3 × 1.5 FT', price: 12999, hint: 'Living wall / studio' },
      { label: '4 × 2 FT', price: 16999, hint: 'Feature backdrop' },
    ],
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read selected file'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not encode mockup image'));
    reader.readAsDataURL(blob);
  });
}

export const CustomDesignPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, currency } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestedSlug = searchParams.get('material') || '';
  const initialMat =
    MATERIALS.find((m) => m.slug === requestedSlug || m.id === requestedSlug)?.id || 'framed_acp';

  const [material, setMaterial] = useState<ArtMaterial>(initialMat);
  const selectedMaterial = useMemo(
    () => MATERIALS.find((m) => m.id === material) || MATERIALS[0],
    [material],
  );

  const [selectedSize, setSelectedSize] = useState<string>(selectedMaterial.sizes[1]?.label || selectedMaterial.sizes[0].label);
  const [neonText, setNeonText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string>('');
  const [artworkFileName, setArtworkFileName] = useState<string>('');
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string>('');

  useEffect(() => {
    if (!selectedMaterial.sizes.some((s) => s.label === selectedSize)) {
      setSelectedSize(selectedMaterial.sizes[0].label);
    }
  }, [selectedMaterial, selectedSize]);

  const activeSizeOption =
    selectedMaterial.sizes.find((s) => s.label === selectedSize) || selectedMaterial.sizes[0];

  const handleFilePicked = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a PNG, JPG, or WebP image.', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Image must be under 15 MB.', 'error');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = new Image();
      img.onload = () => setImageDims({ w: img.width, h: img.height });
      img.src = dataUrl;
      setArtworkPreviewUrl(dataUrl);
      setArtworkFileName(file.name);
      if (!customTitle) {
        const clean = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        if (clean) setCustomTitle(clean);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load image', 'error');
    }
  };

  const handleAddToCartAndCheckout = async (goCheckout: boolean) => {
    if (!artworkPreviewUrl && !(material === 'neon' && neonText.trim())) {
      showToast(
        material === 'neon'
          ? 'Upload a design or enter your neon text first.'
          : 'Upload your artwork image first.',
        'error',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let originalImageUrl: string | undefined;
      let originalStoragePath: string | undefined;
      let mockupImageUrl: string | undefined;
      let mockupStoragePath: string | undefined;

      if (artworkPreviewUrl) {
        setSubmitStep('Saving artwork to studio storage…');
        const origRes = await api.uploadCustomArtFile({
          image: artworkPreviewUrl,
          kind: 'originals',
          fileName: artworkFileName || 'custom-art',
        });
        originalImageUrl = origRes.url;
        originalStoragePath = origRes.storagePath;

        setSubmitStep('Generating photorealistic room mockup…');
        const mockupBlob = await renderRoomMockupBlob({
          artworkDataUrlOrSrc: artworkPreviewUrl,
          material,
          sizeLabel: activeSizeOption.label,
        });
        if (mockupBlob) {
          const mockupDataUrl = await blobToDataUrl(mockupBlob);
          const mockRes = await api.uploadCustomArtFile({
            image: mockupDataUrl,
            kind: 'mockups',
            fileName: `${artworkFileName || 'custom'}-room`,
          });
          mockupImageUrl = mockRes.url;
          mockupStoragePath = mockRes.storagePath;
        }
      }

      setSubmitStep('Saving your custom order configuration…');
      const title =
        customTitle.trim() ||
        (material === 'neon' && neonText.trim()
          ? `Custom Neon — "${neonText.trim().slice(0, 28)}"`
          : `Custom ${selectedMaterial.name}`);

      const created = await api.createCustomArtRequest({
        material,
        size: activeSizeOption.label,
        neonText: material === 'neon' ? neonText.trim() || undefined : undefined,
        title,
        unitPrice: activeSizeOption.price,
        originalImageUrl,
        originalStoragePath,
        mockupImageUrl,
        mockupStoragePath,
        status: 'in_cart',
      });

      const requestId = created.request.id as string;
      const thumbUrl = mockupImageUrl || originalImageUrl || '/mockups/room-neon.jpg';

      addToCart({
        id: `custom-${requestId}`,
        category_id: 'custom-art',
        title,
        name: title,
        description: `Custom ${selectedMaterial.name} · ${activeSizeOption.label}`,
        material,
        selling_price: activeSizeOption.price,
        price: activeSizeOption.price,
        main_image_url: thumbUrl,
        imageUrl: thumbUrl,
        variants: { sizes: [activeSizeOption.label] },
        quantity: 1,
        selectedSize: activeSizeOption.label,
        selectedColor: '',
        customArtRequestId: requestId,
        customImageUrl: originalImageUrl,
        mockupImageUrl: mockupImageUrl || thumbUrl,
      });

      showToast('Custom piece added to your bag', 'success');
      if (goCheckout) {
        navigate('/checkout');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not save your custom piece', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitStep('');
    }
  };

  return (
    <div className="pb-24">
      <SEOHead
        title="Your Art, Printed to Order | Tinge"
        description="Upload your artwork, choose Framed ACP, Canvas, Sunboard, or Neon, preview it in a real room above a sofa with side table and flowers, and check out."
      />

      {/* Editorial header */}
      <section className="border-b border-hairline">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-coral">
            Your Art · Studio Customizer
          </p>
          <h1 className="mt-3 font-playfair text-3xl sm:text-5xl font-medium tracking-tight text-brand-primary max-w-3xl [text-wrap:balance]">
            Your artwork, printed &amp; framed in our studio.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-brand-secondary">
            Pick your material and sheet cut, upload your photo or illustration, and see how it looks
            in a real room before you check out. Our print team inspects and upscales every file before production.
          </p>
        </div>
      </section>

      {/* Main 50/50 split: Live room preview left, controls right */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-10 pt-8 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
          {/* LEFT 50% — Photorealistic room mockup + uploaded file check */}
          <div className="lg:sticky lg:top-24 space-y-5">
            <RoomMockupPreview
              image={artworkPreviewUrl || undefined}
              neonText={material === 'neon' ? neonText || 'Your Words Here' : undefined}
              material={material}
              sizeLabel={activeSizeOption.label}
              title={customTitle || 'Your artwork'}
            />

            {artworkPreviewUrl ? (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={artworkPreviewUrl}
                    alt="Uploaded artwork thumbnail"
                    className="h-14 w-14 shrink-0 rounded-xl object-cover bg-wall"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-primary">{artworkFileName}</p>
                    <p className="font-mono text-[11px] text-brand-secondary">
                      {imageDims ? `${imageDims.w} × ${imageDims.h} px · ` : ''}
                      Studio print-prep included
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setArtworkPreviewUrl('');
                    setArtworkFileName('');
                    setImageDims(null);
                  }}
                  aria-label="Remove uploaded image"
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline text-brand-secondary hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-hairline bg-wall/60 p-4 text-[13px] text-brand-secondary">
                Upload an image on the right to see your exact artwork hanging above the sofa next to the oak side table.
              </div>
            )}
          </div>

          {/* RIGHT 50% — 4 clear steps */}
          <div className="space-y-9">
            {/* Step 1: Material */}
            <fieldset>
              <legend className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-brand-coral">01</span>
                <span className="font-playfair text-2xl font-medium text-brand-primary">Choose material</span>
              </legend>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MATERIALS.map((mat) => {
                  const active = mat.id === material;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMaterial(mat.id)}
                      className={`relative flex cursor-pointer flex-col items-start rounded-2xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral ${
                        active
                          ? 'border-brand-ink dark:border-brand-cream shadow-[inset_0_0_0_1px_currentColor] bg-white dark:bg-brand-surface'
                          : 'border-hairline hover:border-brand-secondary'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-[15px] font-medium text-brand-primary">{mat.name}</span>
                        {active && <CheckCircleIcon className="h-4 w-4 text-brand-primary" aria-hidden="true" />}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-brand-secondary">{mat.summary}</p>
                      <span className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-secondary">
                        {mat.finishNote}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Step 2: Size */}
            <fieldset>
              <legend className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-brand-coral">02</span>
                <span className="font-playfair text-2xl font-medium text-brand-primary">Choose size</span>
              </legend>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {selectedMaterial.sizes.map((s) => {
                  const active = s.label === activeSizeOption.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedSize(s.label)}
                      className={`relative flex min-h-[82px] cursor-pointer flex-col justify-center rounded-xl border px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral ${
                        active
                          ? 'border-brand-ink dark:border-brand-cream shadow-[inset_0_0_0_1px_currentColor]'
                          : 'border-hairline hover:border-brand-secondary'
                      }`}
                    >
                      <span className="text-[15px] font-medium text-brand-primary">{s.label}</span>
                      <span className="mt-0.5 text-[13px] font-medium text-brand-primary tabular-nums">
                        {formatCurrency(s.price, currency, { showDecimals: false })}
                      </span>
                      <span className="mt-0.5 text-[12px] text-brand-secondary">{s.hint}</span>
                      {active && (
                        <CheckCircleIcon className="absolute right-3 top-3 h-4 w-4 text-brand-primary" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Step 3: Upload artwork (or neon wording) */}
            <div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-brand-coral">03</span>
                <h2 className="font-playfair text-2xl font-medium text-brand-primary">
                  {material === 'neon' ? 'Upload design or enter words' : 'Upload your artwork'}
                </h2>
              </div>

              {material === 'neon' && (
                <div className="mt-4">
                  <label htmlFor="neon-words" className="block font-mono text-[11px] uppercase tracking-[0.12em] text-brand-secondary mb-2">
                    Neon wording (optional if uploading logo)
                  </label>
                  <input
                    id="neon-words"
                    type="text"
                    value={neonText}
                    onChange={(e) => setNeonText(e.target.value)}
                    placeholder="e.g. Stay Golden"
                    className="w-full rounded-xl border border-hairline bg-transparent px-4 py-3 text-[15px] text-brand-primary placeholder:text-brand-secondary/60 focus:border-brand-ink dark:focus:border-brand-cream focus:outline-none"
                  />
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilePicked(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? 'border-brand-coral bg-brand-coral/5'
                    : 'border-hairline hover:border-brand-secondary'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
                <UploadCloudIcon className="h-8 w-8 text-brand-secondary" aria-hidden="true" />
                <p className="mt-3 text-[15px] font-medium text-brand-primary">
                  {artworkPreviewUrl ? 'Replace image' : 'Drop your artwork here or click to browse'}
                </p>
                <p className="mt-1 text-[13px] text-brand-secondary">
                  PNG, JPG, or WebP up to 15 MB · Low-res photos are upscaled by our studio before printing
                </p>
              </div>

              <div className="mt-4">
                <label htmlFor="custom-piece-title" className="block font-mono text-[11px] uppercase tracking-[0.12em] text-brand-secondary mb-2">
                  Title or note (optional)
                </label>
                <input
                  id="custom-piece-title"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Living room landscape print"
                  className="w-full rounded-xl border border-hairline bg-transparent px-4 py-3 text-[15px] text-brand-primary placeholder:text-brand-secondary/60 focus:border-brand-ink dark:focus:border-brand-cream focus:outline-none"
                />
              </div>
            </div>

            {/* Step 4: Summary + Checkout CTA */}
            <div className="rounded-2xl border border-hairline p-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">
                    {selectedMaterial.name} · {activeSizeOption.label}
                  </p>
                  <p className="mt-1 text-[13px] text-brand-secondary flex items-center gap-1.5">
                    <SparklesIcon className="h-3.5 w-3.5 text-brand-coral" aria-hidden="true" />
                    Saved to studio bucket &amp; prepared for print
                  </p>
                </div>
                <p className="text-2xl font-medium text-brand-primary tabular-nums">
                  {formatCurrency(activeSizeOption.price, currency, { showDecimals: false })}
                </p>
              </div>

              {isSubmitting && submitStep && (
                <p className="text-[13px] text-brand-coral animate-pulse">{submitStep}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAddToCartAndCheckout(true)}
                  className="flex min-h-[54px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-ink px-6 text-[15px] font-medium text-brand-cream transition-colors hover:bg-black disabled:opacity-50 dark:bg-brand-cream dark:text-brand-ink dark:hover:bg-white"
                >
                  {isSubmitting ? 'Preparing…' : 'Order & Checkout'}
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleAddToCartAndCheckout(false)}
                  className="flex min-h-[54px] cursor-pointer items-center justify-center rounded-full border border-hairline px-6 text-[15px] font-medium text-brand-primary transition-colors hover:border-brand-ink disabled:opacity-50 dark:hover:border-brand-cream"
                >
                  Add to Bag
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
