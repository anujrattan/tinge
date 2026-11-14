import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/currency';
import type { CurrencyCode } from '../../../utils/currency';
import type { CustomArtRequest } from '../../../types';
import { DownloadIcon, SparklesIcon, RefreshCwIcon, CheckCircleIcon } from '../../../components/icons';

interface CustomArtViewProps {
  currency: CurrencyCode;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  in_cart: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  ordered: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  enhanced: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
  ready_for_print: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  fulfilled: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

export const CustomArtView: React.FC<CustomArtViewProps> = ({ currency }) => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<CustomArtRequest[]>([]);
  const [providers, setProviders] = useState<{
    openrouterConfigured: boolean;
    openrouterModel: string;
    falConfigured: boolean;
    studioLocalAvailable: boolean;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'openrouter' | 'fal' | 'studio_local'>('auto');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = async (filter = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.getAdminCustomArtRequests(filter);
      setRequests(res.requests || []);
      setProviders(res.providers || null);
      const map: Record<string, string> = {};
      for (const r of res.requests || []) {
        map[r.id] = r.admin_notes || '';
      }
      setNotesDraft(map);
    } catch (err: any) {
      showToast(err.message || 'Failed to load custom art requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  const handleEnhance = async (id: string, action: 'upscale_2x' | 'upscale_4x' | 'clean' | 'print_prep') => {
    setBusyId(id);
    try {
      const res = await api.enhanceCustomArt(id, { action, provider: selectedProvider });
      setRequests((prev) => prev.map((r) => (r.id === id ? res.request : r)));
      showToast(
        res.request?.ai_notes || 'Print-ready image generated',
        'success',
      );
    } catch (err: any) {
      showToast(err.message || 'Enhancement failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await api.updateCustomArtRequest(id, {
        status,
        admin_notes: notesDraft[id],
      });
      setRequests((prev) => prev.map((r) => (r.id === id ? res.request : r)));
      showToast(`Marked as ${status.replace(/_/g, ' ')}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (id: string, variant: 'enhanced' | 'original' | 'mockup') => {
    try {
      await api.downloadCustomArtAsset(id, variant);
    } catch (err: any) {
      showToast(err.message || 'Download failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar: status filter + AI provider selector */}
      <Card className="p-4 bg-white dark:bg-brand-surface/60 border border-gray-200 dark:border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'ordered', 'enhanced', 'ready_for_print', 'fulfilled', 'in_cart'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-brand-ink text-white dark:bg-brand-cream dark:text-brand-ink'
                    : 'border border-gray-200 dark:border-white/15 text-brand-secondary hover:text-brand-primary'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-brand-secondary">
              AI Engine:
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                className="ml-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-brand-bg px-2.5 py-1.5 text-xs text-brand-primary"
              >
                <option value="auto">
                  Auto ({providers?.openrouterConfigured ? 'OpenRouter' : providers?.falConfigured ? 'fal.ai' : 'Studio Local'})
                </option>
                <option value="studio_local">Studio Local (Lanczos 2×/4× — Free)</option>
                <option value="openrouter" disabled={!providers?.openrouterConfigured}>
                  OpenRouter {providers?.openrouterConfigured ? `(${providers.openrouterModel})` : '(add OPENROUTER_API_KEY)'}
                </option>
                <option value="fal" disabled={!providers?.falConfigured}>
                  fal.ai {providers?.falConfigured ? '(aura-sr)' : '(add FAL_KEY)'}
                </option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => load(statusFilter)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <RefreshCwIcon className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-brand-secondary">Loading custom art requests…</div>
      ) : requests.length === 0 ? (
        <Card className="p-10 text-center text-brand-secondary">
          No custom art requests in this filter yet. Customers can upload artwork at <code>/custom-design</code>.
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isBusy = busyId === req.id;
            return (
              <Card
                key={req.id}
                className="p-5 bg-white dark:bg-brand-surface/60 border border-gray-200 dark:border-white/10 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-brand-primary">
                        {req.title || `Custom ${req.material.replace('_', ' ')}`}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[req.status] || STATUS_BADGE.draft}`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                      {req.order_number && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-brand-primary">
                          Order #{req.order_number}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-brand-secondary">
                      Material: <strong className="text-brand-primary">{req.material}</strong> · Size:{' '}
                      <strong className="text-brand-primary">{req.size}</strong> · Price:{' '}
                      <strong className="text-brand-primary">{formatCurrency(Number(req.unit_price || 0), currency, { showDecimals: false })}</strong>
                      {req.customer_email ? ` · ${req.customer_email}` : ''}
                      {req.neon_text ? ` · Neon text: "${req.neon_text}"` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-brand-secondary">
                    {new Date(req.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Image previews: Original | Room Mockup | Enhanced Print-Ready */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-secondary">Original Upload</span>
                      {req.original_image_url && (
                        <button
                          type="button"
                          onClick={() => handleDownload(req.id, 'original')}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" /> Download
                        </button>
                      )}
                    </div>
                    {req.original_image_url ? (
                      <img src={req.original_image_url} alt="Original upload" className="w-full h-44 object-contain rounded-lg bg-wall" />
                    ) : (
                      <div className="h-44 flex items-center justify-center rounded-lg bg-wall text-xs text-brand-secondary">
                        {req.neon_text ? `Text neon: "${req.neon_text}"` : 'No image'}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-secondary">Room Mockup</span>
                      {req.mockup_image_url && (
                        <button
                          type="button"
                          onClick={() => handleDownload(req.id, 'mockup')}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" /> Download
                        </button>
                      )}
                    </div>
                    {req.mockup_image_url ? (
                      <img src={req.mockup_image_url} alt="Room mockup" className="w-full h-44 object-cover rounded-lg bg-wall" />
                    ) : (
                      <div className="h-44 flex items-center justify-center rounded-lg bg-wall text-xs text-brand-secondary">
                        No mockup saved
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-secondary">
                        Print-Ready (Enhanced)
                      </span>
                      {req.enhanced_image_url && (
                        <button
                          type="button"
                          onClick={() => handleDownload(req.id, 'enhanced')}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" /> Print File
                        </button>
                      )}
                    </div>
                    {req.enhanced_image_url ? (
                      <img src={req.enhanced_image_url} alt="Enhanced print ready" className="w-full h-44 object-contain rounded-lg bg-wall" />
                    ) : (
                      <div className="h-44 flex items-center justify-center rounded-lg bg-wall text-xs text-brand-secondary text-center px-4">
                        Run AI Upscale / Clean below to generate a print-ready asset
                      </div>
                    )}
                    {req.ai_notes && (
                      <p className="text-[11px] text-brand-secondary leading-snug">{req.ai_notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions: Enhance + Notes + Fulfillment Status */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    {req.original_image_url && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleEnhance(req.id, 'upscale_2x')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-ink text-white dark:bg-brand-cream dark:text-brand-ink px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          {isBusy ? 'Processing…' : 'Upscale 2×'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleEnhance(req.id, 'upscale_4x')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/20 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                        >
                          Upscale 4×
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleEnhance(req.id, 'clean')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/20 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                        >
                          Clean &amp; Denoise
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={notesDraft[req.id] || ''}
                      onChange={(e) => setNotesDraft((p) => ({ ...p, [req.id]: e.target.value }))}
                      placeholder="Print / partner notes…"
                      className="rounded-lg border border-gray-300 dark:border-white/20 bg-transparent px-3 py-1.5 text-xs text-brand-primary w-52"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusUpdate(req.id, 'ready_for_print')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" /> Ready for Print
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusUpdate(req.id, 'fulfilled')}
                      className="rounded-lg border border-gray-300 dark:border-white/20 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                    >
                      Mark Fulfilled
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
