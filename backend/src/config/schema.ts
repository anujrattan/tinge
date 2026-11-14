// Zod schema for backend environment variables.
// Supabase: prefer publishable/secret keys; legacy anon/service_role still accepted during migration.
// See https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys

import { z } from 'zod';

/** Treat missing or blank env values as undefined. */
const optionalNonEmpty = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(1).optional(),
);

export const EnvSchema = z
  .object({
    // Server
    PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Supabase — new API keys (preferred)
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISHABLE_KEY: optionalNonEmpty,
    SUPABASE_SECRET_KEY: optionalNonEmpty,
    // Legacy JWT keys (deprecated end of 2026) — fallback only
    SUPABASE_ANON_KEY: optionalNonEmpty,
    SUPABASE_SERVICE_ROLE_KEY: optionalNonEmpty,

    // Redis (optional — TCP for local Node; prefer Upstash REST on Workers)
    REDIS_URL: optionalNonEmpty,

    // JWT auth (app-issued tokens, unrelated to Supabase API keys)
    JWT_SECRET: z.string().min(32),

    // CORS
    CORS_ORIGIN: z.string().url(),
    CORS_CREDENTIALS: z.coerce.boolean().default(true),

    // Razorpay (optional)
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),

    // Resend (optional)
    RESEND_API_KEY: z.string().optional(),

    // AI image enhancement / mockups (optional — falls back to Sharp local studio pipeline)
    OPENROUTER_API_KEY: optionalNonEmpty,
    OPENROUTER_IMAGE_MODEL: optionalNonEmpty,
    FAL_KEY: optionalNonEmpty,

    // Frontend API base (Vite proxy / docs)
    VITE_API_BASE_URL: z.string().default('/api'),
  })
  .superRefine((data, ctx) => {
    if (!data.SUPABASE_PUBLISHABLE_KEY && !data.SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_PUBLISHABLE_KEY'],
        message:
          'Set SUPABASE_PUBLISHABLE_KEY (sb_publishable_…) or legacy SUPABASE_ANON_KEY',
      });
    }
    if (!data.SUPABASE_SECRET_KEY && !data.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_SECRET_KEY'],
        message:
          'Set SUPABASE_SECRET_KEY (sb_secret_…) or legacy SUPABASE_SERVICE_ROLE_KEY',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;
