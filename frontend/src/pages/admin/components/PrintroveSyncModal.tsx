import React, { useState, useCallback } from 'react';
import { PartnerVariant, Product } from '../../../types';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintrovePrefill {
  title: string;
  color: string;
  sizes: string[];
  main_image_url: string;
  mockup_images: string[];
  partner_product_id: string;
  partner_variants: PartnerVariant[];
  fulfillment_partner: string;
}

interface ColorGroup {
  color: string;
  swatchHex: string;
  parentProductId: string;
  parentName: string;
  sizes: string[];
  frontUrl: string;
  backUrl: string;
  partner_variants: PartnerVariant[];
}

// ─── Response normalisation ────────────────────────────────────────────────────

function asArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function extractProductIds(listResp: any): string[] {
  const payload = listResp?.data ?? listResp;
  const candidates = findFirstProductArray(payload);
  const ids = candidates
    .map((p: any) => String(p?.id ?? p?.product_id ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function findFirstProductArray(input: any, depth = 0): any[] {
  if (depth > 6 || input == null) return [];
  if (Array.isArray(input)) {
    const looksGood = input.filter(
      (item) => item && typeof item === 'object' && (item.id || item.product_id || item.name),
    );
    if (looksGood.length) return looksGood;
  }
  if (typeof input === 'object') {
    for (const key of ['products', 'items', 'data', 'results', 'product_list']) {
      if (Array.isArray(input[key]) && input[key].length) return findFirstProductArray(input[key], depth + 1);
    }
    for (const key of Object.keys(input)) {
      const found = findFirstProductArray(input[key], depth + 1);
      if (found.length) return found;
    }
  }
  return [];
}

function getDeep(obj: any, path: string[]): any {
  return path.reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

function collectAllArrays(input: any, depth = 0): any[][] {
  if (depth > 6 || input == null) return [];
  const out: any[][] = [];
  if (Array.isArray(input)) {
    out.push(input);
    input.forEach((item) => out.push(...collectAllArrays(item, depth + 1)));
    return out;
  }
  if (typeof input === 'object') {
    Object.values(input).forEach((v) => out.push(...collectAllArrays(v, depth + 1)));
  }
  return out;
}

function resolveVariants(payload: any): any[] {
  const paths = [
    ['data', 'variants'],
    ['variants'],
    ['data', 'product', 'variants'],
    ['product', 'variants'],
    ['data', 'product_variants'],
    ['product_variants'],
    ['data', 'items'],
    ['items'],
  ];
  for (const path of paths) {
    const v = asArray(getDeep(payload, path));
    if (v.length) return v;
  }
  // Deep fallback — find largest array whose items look like variants
  const deepArrays = collectAllArrays(payload)
    .filter((arr) =>
      arr.some(
        (item) =>
          item && typeof item === 'object' && (item.sku || item.variant_id || item.design || item.product),
      ),
    )
    .sort((a, b) => b.length - a.length);
  return deepArrays[0] ?? [];
}

function resolveProduct(payload: any): any {
  const candidates = [
    getDeep(payload, ['data', 'product']),
    getDeep(payload, ['product']),
    getDeep(payload, ['data', 'parent_product']),
    getDeep(payload, ['parent_product']),
  ].filter((v) => v && typeof v === 'object' && !Array.isArray(v));
  return (
    candidates.find((c: any) => c?.id || c?.product_id || c?.name) ??
    candidates[0] ??
    {}
  );
}

/** Accepts a URL string or common nested shapes (`{ url }`, Printrove `mockup` objects). */
function coerceUrl(candidate: any): string {
  if (candidate == null) return '';
  if (typeof candidate === 'string') {
    const v = candidate.trim();
    return /^https?:\/\//i.test(v) ? v : '';
  }
  if (typeof candidate === 'object' && !Array.isArray(candidate)) {
    const o = candidate as Record<string, unknown>;
    for (const key of ['front_mockup', 'url', 'src', 'href']) {
      const inner = coerceUrl(o[key]);
      if (inner) return inner;
    }
    const front = o.front;
    if (front && typeof front === 'object') {
      const nested = coerceUrl((front as Record<string, unknown>).url);
      if (nested) return nested;
    }
    if (typeof front === 'string') {
      const v = coerceUrl(front);
      if (v) return v;
    }
  }
  return '';
}

function pickFirstUrl(candidates: any[]): string {
  for (const c of candidates) {
    const value = coerceUrl(c);
    if (value) return value;
  }
  return '';
}

function buildColorMaps(profiles: Array<{ name: string; hex: string }>) {
  const nameToHex = new Map<string, string>();
  const hexToName = new Map<string, string>();
  (profiles || []).forEach((p) => {
    const name = String(p?.name || '').trim();
    const hex = String(p?.hex || '').trim().toUpperCase();
    if (!name || !/^#[0-9A-F]{6}$/.test(hex)) return;
    nameToHex.set(name.toLowerCase(), hex);
    hexToName.set(hex, name);
  });
  return { nameToHex, hexToName };
}

function normalizeIncomingColor(
  rawColor: string,
  maps: { nameToHex: Map<string, string>; hexToName: Map<string, string> },
): { storedColor: string; swatchHex: string } {
  const raw = String(rawColor || '').trim();
  if (!raw) return { storedColor: '', swatchHex: '#808080' };

  // If Printrove returns hex, convert to canonical name if known.
  if (raw.startsWith('#')) {
    const hex = raw.toUpperCase();
    const knownName = maps.hexToName.get(hex);
    if (knownName) return { storedColor: knownName, swatchHex: hex };
    return { storedColor: hex, swatchHex: /^#[0-9A-F]{6}$/.test(hex) ? hex : '#808080' };
  }

  // If Printrove returns a name, normalize casing and attach canonical hex if known.
  const knownHex = maps.nameToHex.get(raw.toLowerCase());
  if (knownHex) {
    const canonicalName = maps.hexToName.get(knownHex) || raw;
    return { storedColor: canonicalName, swatchHex: knownHex };
  }

  return { storedColor: raw, swatchHex: '#808080' };
}

function buildColorGroups(
  detailResps: any[],
  colorProfiles: Array<{ name: string; hex: string }>,
): ColorGroup[] {
  const map = new Map<string, ColorGroup>();
  const colorMaps = buildColorMaps(colorProfiles);

  detailResps.forEach((resp) => {
    const payload = resp?.data ?? resp;
    const product = resolveProduct(payload);
    const variants = resolveVariants(payload);

    const parentId = String(product?.id ?? product?.product_id ?? '');
    const parentName = String(product?.name ?? product?.title ?? product?.product_name ?? 'Unnamed Product');

    variants.forEach((variant: any) => {
      const variantProduct = variant?.product ?? {};
      const rawColor = String(
        variantProduct?.color ?? variantProduct?.colour ?? variant?.color ?? variant?.colour ?? '',
      );
      const size = String(variantProduct?.size ?? variant?.size ?? '');
      const variantId = String(variant?.id ?? variant?.variant_id ?? '');
      const sku = String(variant?.sku ?? '');
      // IMPORTANT:
      // Prefer Printrove garment mockups (`data.variants[i].mockup.front_mockup`) over flat assets.
      // `design.front.url` is usually the raw print file, not the product mockup.
      const frontUrl = pickFirstUrl([
        variant?.mockup?.front_mockup,
        variant?.mockup?.front,
        variantProduct?.mockup?.front_mockup,
        variantProduct?.mockup?.front,
        product?.mockup?.front_mockup,
        product?.mockup?.front,
        variant?.mockup_front_url,
        variant?.mockup_url,
        variant?.preview_front_url,
        variant?.preview_url,
        variant?.thumbnail_url,
        variant?.image_url,
        variantProduct?.mockup_front_url,
        variantProduct?.mockup_url,
        variantProduct?.preview_front_url,
        variantProduct?.preview_url,
        variantProduct?.thumbnail_url,
        variantProduct?.image_url,
        product?.mockup_front_url,
        product?.mockup_url,
        product?.preview_front_url,
        product?.preview_url,
        product?.thumbnail_url,
        product?.image_url,
        // Fallback (raw design file)
        variant?.design?.front?.url,
        variant?.design_front?.url,
        variant?.front_url,
      ]);
      const backUrl = pickFirstUrl([
        variant?.mockup?.back_mockup,
        variant?.mockup?.back,
        variantProduct?.mockup?.back_mockup,
        variantProduct?.mockup?.back,
        variant?.mockup_back_url,
        variant?.preview_back_url,
        variantProduct?.mockup_back_url,
        variantProduct?.preview_back_url,
        product?.mockup_back_url,
        product?.preview_back_url,
        // Fallback (raw design file)
        variant?.design?.back?.url,
        variant?.design_back?.url,
        variant?.back_url,
      ]);

      if (!rawColor || !size) return;
      const { storedColor, swatchHex } = normalizeIncomingColor(rawColor, colorMaps);
      if (!storedColor) return;

      const key = `${parentId}__${storedColor}`;
      if (!map.has(key)) {
        map.set(key, {
          color: storedColor,
          swatchHex,
          parentProductId: parentId,
          parentName,
          sizes: [],
          frontUrl,
          backUrl,
          partner_variants: [],
        });
      }
      const group = map.get(key)!;
      if (!group.sizes.includes(size)) group.sizes.push(size);
      if (!group.frontUrl && frontUrl) group.frontUrl = frontUrl;
      if (!group.backUrl && backUrl) group.backUrl = backUrl;
      group.partner_variants.push({
        size,
        partner_variant_id: variantId,
        partner_sku: sku,
        mockup_front_url: frontUrl || undefined,
      });
    });
  });

  return Array.from(map.values());
}

function normalizeListingColor(color: string | undefined | null): string {
  return String(color ?? '')
    .trim()
    .toLowerCase();
}

function findStoreProductForPrintroveListing(products: Product[], group: ColorGroup): Product | undefined {
  const pid = String(group.parentProductId || '').trim();
  if (!pid) return undefined;
  const wantColor = normalizeListingColor(group.color);
  return products.find((p) => {
    const ppid = p.partner_product_id != null ? String(p.partner_product_id).trim() : '';
    if (!ppid || ppid !== pid) return false;
    return normalizeListingColor(p.color) === wantColor;
  });
}

export type PrintroveSyncDiffSummary = {
  printroveTotal: number;
  skippedAlreadyInStore: number;
  variantHints: Array<{ title: string; color: string; detail: string }>;
};

/** Drop Printrove color groups that already exist in the store (same partner product + color); surface new variants on existing listings as hints only. */
export function filterNewPrintroveGroups(
  groups: ColorGroup[],
  storeProducts: Product[],
): { newGroups: ColorGroup[]; summary: PrintroveSyncDiffSummary } {
  const newGroups: ColorGroup[] = [];
  let skippedAlreadyInStore = 0;
  const variantHints: PrintroveSyncDiffSummary['variantHints'] = [];

  for (const g of groups) {
    const existing = findStoreProductForPrintroveListing(storeProducts, g);
    if (!existing) {
      newGroups.push(g);
      continue;
    }

    const existingIds = new Set(
      (existing.partner_variants || [])
        .map((v) => String(v.partner_variant_id || '').trim())
        .filter(Boolean),
    );
    const newVariants = g.partner_variants.filter(
      (v) => !existingIds.has(String(v.partner_variant_id || '').trim()),
    );

    if (newVariants.length === 0) {
      skippedAlreadyInStore += 1;
      continue;
    }

    const sizeLabels = [...new Set(newVariants.map((v) => v.size).filter(Boolean))];
    variantHints.push({
      title: g.parentName,
      color: g.color,
      detail: `${newVariants.length} new Printrove variant(s)${sizeLabels.length ? ` (sizes: ${sizeLabels.join(', ')})` : ''} — you already have a listing for this product and color. Open that product and update Printrove variant mapping instead of importing another draft.`,
    });
    skippedAlreadyInStore += 1;
  }

  return {
    newGroups,
    summary: {
      printroveTotal: groups.length,
      skippedAlreadyInStore,
      variantHints,
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ImportResult {
  created: number;
  failed: number;
  failedItems: Array<{ title: string; reason: string }>;
}

interface PrintroveSyncModalProps {
  onClose: () => void;
  onPrefill: (data: PrintrovePrefill) => void;
  onImportComplete?: () => void;
}

export const PrintroveSyncModal: React.FC<PrintroveSyncModalProps> = ({ onClose, onPrefill, onImportComplete }) => {
  const [step, setStep] = useState<'idle' | 'loading' | 'done' | 'error' | 'importing' | 'import-done'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [syncDiffSummary, setSyncDiffSummary] = useState<PrintroveSyncDiffSummary | null>(null);

  const fetchAndBuild = useCallback(async () => {
    setStep('loading');
    setErrorMsg('');
    setSyncDiffSummary(null);
    setImportResult(null);
    setFetchProgress({ done: 0, total: 0 });
    try {
      const listResp = await api.getPrintroveProducts();
      if (!listResp?.success) {
        throw new Error('List My Products API failed. Check Printrove credentials.');
      }
      const ids = extractProductIds(listResp);
      if (!ids.length) {
        throw new Error('No products found in your Printrove account.');
      }
      setFetchProgress({ done: 0, total: ids.length });
      const details: any[] = [];
      for (const id of ids) {
        const detail = await api.getPrintroveProductById(id);
        details.push(detail);
        setFetchProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
      const profiles = await api.getColorProfiles().catch(() => []);
      const groups = buildColorGroups(details, profiles || []);
      if (!groups.length) {
        throw new Error(
          'Fetched product details but could not extract color/size variants. Check the response shape on the /pt page.',
        );
      }

      const storeProducts = (await api.getAdminProducts().catch(() => [])) as Product[];
      const safeStore = Array.isArray(storeProducts) ? storeProducts : [];
      const { newGroups, summary } = filterNewPrintroveGroups(groups, safeStore);
      setSyncDiffSummary(summary);
      setColorGroups(newGroups);
      setStep('done');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Unknown error');
      setStep('error');
    }
  }, []);

  const importAllAsDrafts = useCallback(async () => {
    if (!colorGroups.length) return;
    setStep('importing');
    setImportProgress({ done: 0, total: colorGroups.length });

    const items = colorGroups.map((group) => ({
      title: group.parentName,
      color: group.color,
      sizes: group.sizes,
      main_image_url: group.frontUrl,
      mockup_images: group.backUrl ? [group.backUrl] : [],
      partner_product_id: group.parentProductId,
      partner_variants: group.partner_variants,
      fulfillment_partner: 'Printrove',
    }));

    try {
      const result = await api.bulkDraftImport(items);
      setImportResult({
        created: result.summary.created,
        failed: result.summary.failed,
        failedItems: result.failed || [],
      });
      setStep('import-done');
      onImportComplete?.();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Import failed');
      setStep('error');
    }
  }, [colorGroups, onImportComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-brand-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-brand-primary">Sync from Printrove</h2>
            <p className="text-xs text-brand-secondary mt-0.5">
              Fetch Printrove listings; only <strong className="text-brand-primary">new</strong> product + color rows are offered as drafts (existing catalog is skipped).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-brand-secondary hover:text-brand-primary transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {step === 'idle' && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-primary">Ready to sync</p>
                <p className="text-xs text-brand-secondary mt-1">
                  Fetches your Printrove catalog and compares it to this store. Listings already imported (same Printrove product ID and color) are skipped so you only see what is new.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAndBuild}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                Fetch from Printrove
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <p className="text-sm text-brand-secondary">
                {fetchProgress.total > 0
                  ? `Fetching product details… ${fetchProgress.done} / ${fetchProgress.total}`
                  : 'Fetching product list…'}
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {errorMsg}
              </div>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-brand-primary text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <p className="text-sm text-brand-secondary">
                Importing {importProgress.total} listing{importProgress.total !== 1 ? 's' : ''} as drafts…
              </p>
            </div>
          )}

          {step === 'import-done' && importResult && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-brand-primary">Import Complete</p>
                <p className="text-sm text-brand-secondary mt-1">
                  <span className="text-emerald-500 font-semibold">{importResult.created} product{importResult.created !== 1 ? 's' : ''}</span> imported as drafts.
                  {importResult.failed > 0 && (
                    <span className="text-red-400 font-semibold ml-1">{importResult.failed} failed.</span>
                  )}
                </p>
                <p className="text-xs text-brand-secondary mt-2">
                  Go to Admin → Products and toggle "Show Drafts" to review, fill in pricing & description, then publish.
                </p>
              </div>
              {importResult.failedItems.length > 0 && (
                <div className="w-full rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-left">
                  <p className="text-xs font-semibold text-red-500 mb-2">Failed items:</p>
                  {importResult.failedItems.map((f, i) => (
                    <p key={i} className="text-xs text-red-400">{f.title}: {f.reason}</p>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                Done
              </button>
            </div>
          )}

          {step === 'done' && (
            <>
              {syncDiffSummary && syncDiffSummary.printroveTotal > 0 && (
                <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-brand-secondary space-y-1">
                  <p>
                    <span className="font-semibold text-brand-primary">{syncDiffSummary.printroveTotal}</span> color
                    listing{syncDiffSummary.printroveTotal !== 1 ? 's' : ''} on Printrove.
                    {syncDiffSummary.skippedAlreadyInStore > 0 && (
                      <>
                        {' '}
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {syncDiffSummary.skippedAlreadyInStore} skipped
                        </span>{' '}
                        (already in your store or only new variants on an existing listing — see notes below).
                      </>
                    )}
                  </p>
                  {syncDiffSummary.variantHints.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-700 dark:text-amber-300/95">
                      {syncDiffSummary.variantHints.map((h, idx) => (
                        <li key={idx}>
                          <span className="font-medium text-brand-primary">{h.title}</span> · {h.color}: {h.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs">
                    {colorGroups.length} new to import
                  </span>
                  <span className="text-xs text-brand-secondary hidden sm:block">
                    Each card = 1 color + sizes (not already saved for this store).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={importAllAsDrafts}
                  disabled={colorGroups.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import All as Drafts ({colorGroups.length})
                </button>
              </div>

              {colorGroups.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white dark:bg-brand-bg px-4 py-8 text-center text-sm text-brand-secondary">
                  {syncDiffSummary && syncDiffSummary.printroveTotal > 0 ? (
                    <p>
                      Nothing new to import — every Printrove color listing is already represented in your catalog
                      {syncDiffSummary.variantHints.length > 0
                        ? ', or only has new variants on listings you already have (see notes above).'
                        : '.'}
                    </p>
                  ) : (
                    <p>No listings to show.</p>
                  )}
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {colorGroups.map((group, i) => (
                  <article
                    key={`${group.parentProductId}-${group.color}-${i}`}
                    className="rounded-xl border border-white/10 bg-white dark:bg-brand-bg p-4 flex flex-col gap-3"
                  >
                    {/* Image */}
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                      {group.frontUrl ? (
                        <img src={group.frontUrl} alt={group.parentName} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-brand-secondary">No image</div>
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <p className="text-sm font-semibold text-brand-primary line-clamp-1">{group.parentName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Color swatch */}
                        <span className="flex items-center gap-1 text-xs text-brand-secondary">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 inline-block"
                            style={{ backgroundColor: group.swatchHex }}
                          />
                          {group.color}
                        </span>
                        <span className="text-xs text-brand-secondary">·</span>
                        <span className="text-xs text-brand-secondary">{group.sizes.join(', ')}</span>
                      </div>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 truncate">
                        ID: {group.parentProductId}
                      </p>
                    </div>

                    {/* Variant SKU preview */}
                    <div className="overflow-auto max-h-28 rounded-md border border-white/10">
                      <table className="min-w-full text-[10px]">
                        <thead className="bg-indigo-500/10">
                          <tr>
                            <th className="text-left px-2 py-1">Size</th>
                            <th className="text-left px-2 py-1">SKU</th>
                            <th className="text-left px-2 py-1">Variant ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.partner_variants.map((pv, j) => (
                            <tr key={j} className="border-t border-white/10">
                              <td className="px-2 py-1 font-medium">{pv.size}</td>
                              <td className="px-2 py-1 font-mono text-brand-secondary">{pv.partner_sku || '—'}</td>
                              <td className="px-2 py-1 font-mono text-brand-secondary truncate max-w-[100px]">{pv.partner_variant_id || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action */}
                    <button
                      type="button"
                      onClick={() => {
                        onPrefill({
                          title: group.parentName,
                          color: group.color,
                          sizes: group.sizes,
                          main_image_url: group.frontUrl,
                          mockup_images: group.backUrl ? [group.backUrl] : [],
                          partner_product_id: group.parentProductId,
                          partner_variants: group.partner_variants,
                          fulfillment_partner: 'Printrove',
                        });
                        onClose();
                      }}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold transition-all"
                    >
                      Pre-fill Form →
                    </button>
                  </article>
                ))}
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
