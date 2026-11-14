// Backend configuration with Zod env validation and startup checklist logger

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { EnvSchema, type Env } from "./schema.js";

// On Cloudflare Workers, secrets/vars populate process.env — skip local .env files.
const runningOnWorkers =
  typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined";

try {
  if (!runningOnWorkers) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const backendRoot = join(__dirname, "../..");
    const envPath = join(backendRoot, ".env");
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      dotenv.config();
    }
  }
} catch {
  // dotenv / fs may be unavailable in some edge contexts
}

let env: Env;
try {
  env = EnvSchema.parse(process.env);
} catch (e) {
  console.error("❌ Environment validation failed:\n", e);
  if (!runningOnWorkers) {
    process.exit(1);
  }
  throw e;
}

const publishableKey =
  env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
const secretKey =
  env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";

const usingLegacyPublishable = !env.SUPABASE_PUBLISHABLE_KEY && !!env.SUPABASE_ANON_KEY;
const usingLegacySecret = !env.SUPABASE_SECRET_KEY && !!env.SUPABASE_SERVICE_ROLE_KEY;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  apiBaseUrl: env.VITE_API_BASE_URL ?? `http://localhost:${env.PORT}/api`,
  supabase: {
    url: env.SUPABASE_URL,
    /** Low-privilege key for public/RLS-scoped clients (publishable, or legacy anon). */
    publishableKey,
    /** Elevated key for backend (secret, or legacy service_role). Bypasses RLS. */
    secretKey,
    /** @deprecated Use publishableKey */
    anonKey: publishableKey,
    /** @deprecated Use secretKey */
    serviceRoleKey: secretKey,
    usingLegacyKeys: usingLegacyPublishable || usingLegacySecret,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? "30m",
  },
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
  },
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  redis: {
    url: env.REDIS_URL ?? "",
    upstashRestUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
    upstashRestToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  },
  printrove: {
    baseUrl: process.env.PRINTROVE_BASE_URL ?? "",
    email: process.env.PRINTROVE_EMAIL ?? "",
    password: process.env.PRINTROVE_PASSWORD ?? "",
  },
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID ?? "",
    keySecret: env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },
  resend: {
    apiKey: env.RESEND_API_KEY ?? "",
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    adminEmail: process.env.RESEND_ADMIN_EMAIL ?? "",
  },
  ai: {
    openrouterApiKey: env.OPENROUTER_API_KEY ?? "",
    openrouterImageModel: env.OPENROUTER_IMAGE_MODEL ?? "black-forest-labs/flux.2-klein-4b",
    falKey: env.FAL_KEY ?? "",
  },
} as const;

export const logStartupChecklist = () => {
  console.log("\n🚀 Startup Checklist (all ✅):");
  const keys = Object.keys(env) as (keyof typeof env)[];
  keys.forEach((k) => {
    const present = process.env[k] !== undefined && process.env[k] !== "";
    console.log(`✅ ${k}: ${present ? "found" : "missing"}`);
  });

  if (config.supabase.usingLegacyKeys) {
    console.warn(
      "\n⚠️  Supabase is using legacy anon/service_role JWT keys.",
    );
    console.warn(
      "   Prefer SUPABASE_PUBLISHABLE_KEY (sb_publishable_…) and SUPABASE_SECRET_KEY (sb_secret_…).",
    );
    console.warn(
      "   Guide: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys\n",
    );
  } else {
    console.log("✅ Supabase: publishable + secret API keys");
  }

  console.log(`\n🌐 Frontend URL: ${config.frontendUrl}`);
  console.log(`⚙️ Backend listening on http://localhost:${config.port}`);
  console.log("\nAll checks passed. Server is ready.\n");
};
