/**
 * Supabase clients for the Tinge backend.
 *
 * Uses publishable + secret API keys (sb_publishable_… / sb_secret_…).
 * Legacy anon / service_role JWTs still work via config fallback until deactivated.
 *
 * @see https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

if (!config.supabase.url || !config.supabase.secretKey) {
  throw new Error(
    'Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).',
  );
}

if (!config.supabase.publishableKey) {
  throw new Error(
    'Supabase publishable key missing. Set SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY).',
  );
}

/**
 * Admin / backend client — secret key bypasses RLS.
 * supabase-js ≥2.112 sends sb_secret_… on `apikey` only (not as Bearer JWT).
 */
export const supabase = createClient(
  config.supabase.url,
  config.supabase.secretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/** Alias — same secret-key client */
export const supabaseAdmin = supabase;

/**
 * RLS-scoped client using the publishable key (public reads / user-scoped flows).
 * Prefer this when you intentionally want RLS enforced.
 */
export const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.publishableKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/** Preferred name for the publishable-key client */
export const supabasePublishable = supabaseAnon;
