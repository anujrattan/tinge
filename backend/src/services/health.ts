/**
 * System health checks for infrastructure and API smoke tests.
 */

import { config } from "../config/index.js";
import { supabaseAdmin } from "./supabase.js";
import { cache, getRedisClient } from "./redis.js";
import { runPrintroveHeartbeat } from "./printrove/heartbeat.js";

export type ServiceStatus = "ok" | "degraded" | "error" | "not_configured";

export interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  status: ServiceStatus;
  timestamp: string;
  environment: string;
  services: ServiceCheck[];
  summary: {
    ok: number;
    degraded: number;
    error: number;
    not_configured: number;
  };
}

export interface CrudTestResult {
  name: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
}

const withTimeout = async <T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    clearTimeout(timer!);
  }
};

const rollupStatus = (checks: ServiceCheck[]): ServiceStatus => {
  if (checks.some((c) => c.status === "error")) return "error";
  if (checks.some((c) => c.status === "degraded")) return "degraded";
  if (checks.every((c) => c.status === "not_configured")) return "not_configured";
  return "ok";
};

const summarize = (checks: ServiceCheck[]) =>
  checks.reduce(
    (acc, c) => {
      acc[c.status] += 1;
      return acc;
    },
    { ok: 0, degraded: 0, error: 0, not_configured: 0 }
  );

export async function checkSupabase(): Promise<ServiceCheck> {
  const startedAt = Date.now();
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    return {
      name: "Supabase",
      status: "not_configured",
      message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
    };
  }

  try {
    const { count, error } = await withTimeout(
      supabaseAdmin
        .from("categories")
        .select("id", { count: "exact", head: true }),
      8000,
      "Supabase"
    );

    if (error) throw error;

    return {
      name: "Supabase",
      status: "ok",
      message: "Database reachable",
      latency_ms: Date.now() - startedAt,
      details: { categories_count: count ?? 0 },
    };
  } catch (error: any) {
    return {
      name: "Supabase",
      status: "error",
      message: error.message || "Supabase check failed",
      latency_ms: Date.now() - startedAt,
    };
  }
}

export async function checkRedis(): Promise<ServiceCheck> {
  const startedAt = Date.now();
  const redisUrl = config.redis.url;

  if (!redisUrl || redisUrl === "redis://localhost:6379") {
    // Still try localhost — may be intentional in dev
  }

  try {
    const client = getRedisClient();
    const pong = await withTimeout(client.ping(), 5000, "Redis ping");
    const testKey = `health:ping:${Date.now()}`;
    await cache.set(testKey, "ok", 30);
    const value = await cache.get(testKey);
    await cache.del(testKey);

    if (pong !== "PONG" || value !== "ok") {
      throw new Error("Redis round-trip failed");
    }

    return {
      name: "Redis (Upstash)",
      status: "ok",
      message: "Cache reachable",
      latency_ms: Date.now() - startedAt,
      details: {
        url_configured: Boolean(process.env.REDIS_URL),
        host: redisUrl.replace(/:[^:@]+@/, ":***@"),
      },
    };
  } catch (error: any) {
    return {
      name: "Redis (Upstash)",
      status: "degraded",
      message: error.message || "Redis unavailable — app runs without cache",
      latency_ms: Date.now() - startedAt,
      details: { url_configured: Boolean(process.env.REDIS_URL) },
    };
  }
}

export function checkRazorpay(): ServiceCheck {
  const configured = Boolean(config.razorpay.keyId && config.razorpay.keySecret);
  return {
    name: "Razorpay",
    status: configured ? "ok" : "not_configured",
    message: configured
      ? "API keys configured"
      : "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set",
    details: {
      key_id_prefix: configured
        ? config.razorpay.keyId.substring(0, 8) + "..."
        : null,
      webhook_configured: Boolean(config.razorpay.webhookSecret),
    },
  };
}

export function checkResend(): ServiceCheck {
  const configured = Boolean(config.resend.apiKey);
  return {
    name: "Resend (Email)",
    status: configured ? "ok" : "not_configured",
    message: configured
      ? "API key configured"
      : "RESEND_API_KEY not set",
    details: {
      from_email: config.resend.fromEmail,
      admin_email: config.resend.adminEmail || null,
    },
  };
}

export async function checkPrintrove(): Promise<ServiceCheck> {
  const startedAt = Date.now();
  if (!config.printrove.email || !config.printrove.password) {
    return {
      name: "Printrove",
      status: "not_configured",
      message: "PRINTROVE_EMAIL / PRINTROVE_PASSWORD not set",
    };
  }

  try {
    const result = await withTimeout(runPrintroveHeartbeat(), 10000, "Printrove");
    return {
      name: "Printrove",
      status: result.success ? "ok" : "error",
      message: result.success
        ? "API docs reachable"
        : `HTTP ${result.status} ${result.statusText}`,
      latency_ms: result.latency_ms,
      details: { endpoint: result.endpoint },
    };
  } catch (error: any) {
    return {
      name: "Printrove",
      status: "error",
      message: error.message || "Printrove check failed",
      latency_ms: Date.now() - startedAt,
    };
  }
}

export function checkApiServer(): ServiceCheck {
  return {
    name: "API Server",
    status: "ok",
    message: "Express process running",
    details: {
      node_env: config.nodeEnv,
      port: config.port,
    },
  };
}

export async function getHealthReport(): Promise<HealthReport> {
  const [supabase, redis, printrove] = await Promise.all([
    checkSupabase(),
    checkRedis(),
    checkPrintrove(),
  ]);

  const services: ServiceCheck[] = [
    checkApiServer(),
    supabase,
    redis,
    checkRazorpay(),
    checkResend(),
    printrove,
  ];

  return {
    status: rollupStatus(services),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    services,
    summary: summarize(services),
  };
}

/** Read-only CRUD smoke tests against live API dependencies. */
export async function runCrudSmokeTests(): Promise<CrudTestResult[]> {
  const results: CrudTestResult[] = [];

  // Categories READ
  {
    const startedAt = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabaseAdmin.from("categories").select("id, name, slug").limit(5),
        8000,
        "Categories read"
      );
      if (error) throw error;
      results.push({
        name: "Categories — READ",
        status: "ok",
        message: `Fetched ${data?.length ?? 0} row(s)`,
        latency_ms: Date.now() - startedAt,
      });
    } catch (error: any) {
      results.push({
        name: "Categories — READ",
        status: "error",
        message: error.message,
        latency_ms: Date.now() - startedAt,
      });
    }
  }

  // Products READ
  {
    const startedAt = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabaseAdmin
          .from("products")
          .select("id, title, is_active")
          .eq("is_active", true)
          .limit(5),
        8000,
        "Products read"
      );
      if (error) throw error;
      results.push({
        name: "Products — READ",
        status: "ok",
        message: `Fetched ${data?.length ?? 0} active product(s)`,
        latency_ms: Date.now() - startedAt,
      });
    } catch (error: any) {
      results.push({
        name: "Products — READ",
        status: "error",
        message: error.message,
        latency_ms: Date.now() - startedAt,
      });
    }
  }

  // Collections READ
  {
    const startedAt = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabaseAdmin.from("collections").select("id, name, slug").limit(5),
        8000,
        "Collections read"
      );
      if (error) throw error;
      results.push({
        name: "Collections — READ",
        status: "ok",
        message: `Fetched ${data?.length ?? 0} row(s)`,
        latency_ms: Date.now() - startedAt,
      });
    } catch (error: any) {
      results.push({
        name: "Collections — READ",
        status: "error",
        message: error.message,
        latency_ms: Date.now() - startedAt,
      });
    }
  }

  // Redis cache round-trip
  {
    const startedAt = Date.now();
    try {
      const key = `health:crud:${Date.now()}`;
      const payload = { test: true, at: new Date().toISOString() };
      await cache.setJSON(key, payload, 60);
      const read = await cache.getJSON<typeof payload>(key);
      await cache.del(key);
      if (!read || read.test !== true) throw new Error("Cache value mismatch");
      results.push({
        name: "Redis — SET/GET/DEL",
        status: "ok",
        message: "Cache round-trip succeeded",
        latency_ms: Date.now() - startedAt,
      });
    } catch (error: any) {
      results.push({
        name: "Redis — SET/GET/DEL",
        status: "degraded",
        message: error.message || "Redis cache unavailable",
        latency_ms: Date.now() - startedAt,
      });
    }
  }

  // Supabase storage bucket check
  {
    const startedAt = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabaseAdmin.storage.from("category-images").list("", { limit: 1 }),
        8000,
        "Storage list"
      );
      if (error) throw error;
      results.push({
        name: "Supabase Storage — LIST",
        status: "ok",
        message: `category-images bucket reachable (${data?.length ?? 0} object(s) sampled)`,
        latency_ms: Date.now() - startedAt,
      });
    } catch (error: any) {
      results.push({
        name: "Supabase Storage — LIST",
        status: "error",
        message: error.message,
        latency_ms: Date.now() - startedAt,
      });
    }
  }

  return results;
}
