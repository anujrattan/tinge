/**
 * Tracking configuration read from Vite env.
 * Set these in .env.local or deployment env; never commit real IDs to repo.
 */

// Cast import.meta as any to avoid strict typing issues while keeping config simple
const env = (import.meta as any).env ?? {};

const gtmContainerId = env.VITE_GTM_CONTAINER_ID ?? '';
const ga4MeasurementId = env.VITE_GA4_MEASUREMENT_ID ?? '';
const metaPixelId = env.VITE_META_PIXEL_ID ?? '';

export const trackingConfig = {
  gtmContainerId: typeof gtmContainerId === 'string' ? gtmContainerId.trim() : '',
  ga4MeasurementId: typeof ga4MeasurementId === 'string' ? ga4MeasurementId.trim() : '',
  metaPixelId: typeof metaPixelId === 'string' ? metaPixelId.trim() : '',
  /** True when at least GTM container ID is set; used to gate tracking init and event pushes. */
  get isTrackingEnabled(): boolean {
    return this.gtmContainerId.length > 0;
  },
} as const;
