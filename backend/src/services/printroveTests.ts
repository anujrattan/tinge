/**
 * Automated Printrove API probe suite — mirrors /pt Command Center checks.
 */

import type { ServiceStatus } from "./health.js";
import { runPrintroveHeartbeat } from "./printrove/heartbeat.js";
import { getPrintroveAccessToken } from "./printrove/auth.js";
import {
  listPrintroveCategories,
  getPrintroveCategoryParentProducts,
  getPrintroveProductVariants,
} from "./printrove/catalog.js";
import { listPrintroveProducts } from "./printrove/productLibrary.js";
import {
  getPrintrovePincodeDetails,
  checkPrintroveServiceability,
  listPrintroveOrders,
} from "./printrove/orders.js";

export interface PrintroveProbeResult {
  serial: number;
  group: string;
  name: string;
  method: string;
  endpoint: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
}

const toStatus = (success: boolean, latencyMs?: number): ServiceStatus => {
  if (!success) return "error";
  if (latencyMs != null && latencyMs > 2000) return "degraded";
  return "ok";
};

const pickFirstArray = (input: any): any[] => {
  if (!input || typeof input !== "object") return [];
  const keys = [
    "categories",
    "data",
    "items",
    "results",
    "products",
    "parent_products",
  ];
  for (const key of keys) {
    if (Array.isArray(input[key])) return input[key];
    if (input[key] && typeof input[key] === "object") {
      const nested = pickFirstArray(input[key]);
      if (nested.length) return nested;
    }
  }
  if (Array.isArray(input)) return input;
  return [];
};

const pickFirstId = (input: any, idKeys = ["id", "category_id", "product_id"]): string | null => {
  const arr = pickFirstArray(input);
  if (!arr.length) return null;
  const item = arr[0];
  if (!item || typeof item !== "object") return null;
  for (const key of idKeys) {
    if (item[key] != null && item[key] !== "") return String(item[key]);
  }
  return null;
};

const pushProbe = (
  results: PrintroveProbeResult[],
  probe: Omit<PrintroveProbeResult, "serial">
) => {
  results.push({ ...probe, serial: results.length + 1 });
};

export async function runPrintroveProbeSuite(): Promise<{
  status: ServiceStatus;
  timestamp: string;
  probes: PrintroveProbeResult[];
  summary: { ok: number; degraded: number; error: number };
}> {
  const probes: PrintroveProbeResult[] = [];

  // 1 — Heartbeat
  try {
    const hb = await runPrintroveHeartbeat();
    pushProbe(probes, {
      group: "System",
      name: "Heartbeat",
      method: "GET",
      endpoint: "/api/printrove/heartbeat",
      status: toStatus(hb.success, hb.latency_ms),
      message: hb.success
        ? "Printrove servers reachable"
        : `HTTP ${hb.status} ${hb.statusText}`,
      latency_ms: hb.latency_ms,
      details: { endpoint: hb.endpoint, status: hb.status },
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "System",
      name: "Heartbeat",
      method: "GET",
      endpoint: "/api/printrove/heartbeat",
      status: "error",
      message: error.message || "Heartbeat failed",
    });
  }

  // 2 — Authentication
  try {
    const auth = await getPrintroveAccessToken();
    const success = auth.status === 200 && Boolean(auth.accessToken);
    pushProbe(probes, {
      group: "System",
      name: "Authentication",
      method: "POST",
      endpoint: "/api/printrove/auth-test",
      status: success ? toStatus(true, auth.latencyMs) : "error",
      message: success
        ? "Bearer token generated"
        : auth.response?.message || `Auth failed (${auth.status})`,
      latency_ms: auth.latencyMs,
      details: {
        endpoint: auth.endpoint,
        token_preview:
          auth.accessToken && auth.accessToken.length > 24
            ? `${auth.accessToken.slice(0, 24)}...`
            : null,
      },
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "System",
      name: "Authentication",
      method: "POST",
      endpoint: "/api/printrove/auth-test",
      status: "error",
      message: error.message || "Auth test failed",
    });
  }

  // 3 — List Categories
  let firstCategoryId: string | null = null;
  try {
    const cats = await listPrintroveCategories();
    firstCategoryId = pickFirstId(cats.data, ["id", "category_id"]);
    const count = pickFirstArray(cats.data).length;
    pushProbe(probes, {
      group: "Catalog",
      name: "List Categories",
      method: "GET",
      endpoint: "/api/printrove/catalog/categories",
      status: toStatus(cats.success, cats.latency_ms),
      message: cats.success
        ? `Fetched ${count} categor${count === 1 ? "y" : "ies"}`
        : `HTTP ${cats.status} ${cats.statusText}`,
      latency_ms: cats.latency_ms,
      details: { sample_category_id: firstCategoryId },
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "Catalog",
      name: "List Categories",
      method: "GET",
      endpoint: "/api/printrove/catalog/categories",
      status: "error",
      message: error.message || "Categories fetch failed",
    });
  }

  // 4 — Parent Products by Category (chained)
  let firstProductId: string | null = null;
  if (firstCategoryId) {
    try {
      const parents = await getPrintroveCategoryParentProducts(firstCategoryId);
      firstProductId = pickFirstId(parents.data, ["id", "product_id", "parent_product_id"]);
      const count = pickFirstArray(parents.data).length;
      pushProbe(probes, {
        group: "Catalog",
        name: "Parent Products by Category",
        method: "GET",
        endpoint: `/api/printrove/catalog/categories/${firstCategoryId}`,
        status: toStatus(parents.success, parents.latency_ms),
        message: parents.success
          ? `Fetched ${count} parent product(s) for category ${firstCategoryId}`
          : `HTTP ${parents.status} ${parents.statusText}`,
        latency_ms: parents.latency_ms,
        details: { category_id: firstCategoryId, sample_product_id: firstProductId },
      });
    } catch (error: any) {
      pushProbe(probes, {
        group: "Catalog",
        name: "Parent Products by Category",
        method: "GET",
        endpoint: `/api/printrove/catalog/categories/:categoryId`,
        status: "error",
        message: error.message || "Parent products fetch failed",
      });
    }
  } else {
    pushProbe(probes, {
      group: "Catalog",
      name: "Parent Products by Category",
      method: "GET",
      endpoint: "/api/printrove/catalog/categories/:categoryId",
      status: "degraded",
      message: "Skipped — no category_id from List Categories",
    });
  }

  // 5 — Product Variants (chained)
  if (firstCategoryId && firstProductId) {
    try {
      const variants = await getPrintroveProductVariants(firstCategoryId, firstProductId);
      const count = pickFirstArray(variants.data).length;
      pushProbe(probes, {
        group: "Catalog",
        name: "Product Variants",
        method: "GET",
        endpoint: `/api/printrove/catalog/categories/${firstCategoryId}/products/${firstProductId}`,
        status: toStatus(variants.success, variants.latency_ms),
        message: variants.success
          ? `Fetched ${count} variant(s)`
          : `HTTP ${variants.status} ${variants.statusText}`,
        latency_ms: variants.latency_ms,
        details: { category_id: firstCategoryId, product_id: firstProductId },
      });
    } catch (error: any) {
      pushProbe(probes, {
        group: "Catalog",
        name: "Product Variants",
        method: "GET",
        endpoint: "/api/printrove/catalog/categories/:categoryId/products/:productId",
        status: "error",
        message: error.message || "Variants fetch failed",
      });
    }
  } else {
    pushProbe(probes, {
      group: "Catalog",
      name: "Product Variants",
      method: "GET",
      endpoint: "/api/printrove/catalog/categories/:categoryId/products/:productId",
      status: "degraded",
      message: "Skipped — no category_id / product_id from prior steps",
    });
  }

  // 6 — List My Products
  try {
    const library = await listPrintroveProducts({ page: 1, per_page: 5 });
    const count = pickFirstArray(library.data).length;
    pushProbe(probes, {
      group: "Product Library",
      name: "List My Products",
      method: "GET",
      endpoint: "/api/printrove/products",
      status: toStatus(library.success, library.latency_ms),
      message: library.success
        ? `Fetched ${count} product(s) on page 1`
        : `HTTP ${library.status} ${library.statusText}`,
      latency_ms: library.latency_ms,
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "Product Library",
      name: "List My Products",
      method: "GET",
      endpoint: "/api/printrove/products",
      status: "error",
      message: error.message || "Product library fetch failed",
    });
  }

  // 7 — Pincode details (smoke: Chennai)
  const smokePincode = "600001";
  try {
    const pin = await getPrintrovePincodeDetails(smokePincode);
    pushProbe(probes, {
      group: "Orders",
      name: "Pincode Details",
      method: "GET",
      endpoint: `/api/printrove/orders/pincode/${smokePincode}`,
      status: toStatus(pin.success, pin.latency_ms),
      message: pin.success
        ? `Pincode ${smokePincode} resolved`
        : `HTTP ${pin.status} ${pin.statusText}`,
      latency_ms: pin.latency_ms,
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "Orders",
      name: "Pincode Details",
      method: "GET",
      endpoint: "/api/printrove/orders/pincode/:pincode",
      status: "error",
      message: error.message || "Pincode check failed",
    });
  }

  // 8 — Serviceability
  try {
    const svc = await checkPrintroveServiceability({
      country: "India",
      pincode: smokePincode,
      weight: "500",
      cod: "false",
    });
    pushProbe(probes, {
      group: "Orders",
      name: "Serviceability Check",
      method: "GET",
      endpoint: "/api/printrove/orders/serviceability",
      status: toStatus(svc.success, svc.latency_ms),
      message: svc.success
        ? `Serviceable for ${smokePincode} (500g, prepaid)`
        : `HTTP ${svc.status} ${svc.statusText}`,
      latency_ms: svc.latency_ms,
      details: { pincode: smokePincode, weight_g: 500, cod: false },
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "Orders",
      name: "Serviceability Check",
      method: "GET",
      endpoint: "/api/printrove/orders/serviceability",
      status: "error",
      message: error.message || "Serviceability check failed",
    });
  }

  // 9 — List Orders
  try {
    const ords = await listPrintroveOrders({ page: 1, per_page: 5 });
    const count = pickFirstArray(ords.data).length;
    pushProbe(probes, {
      group: "Orders",
      name: "List Orders",
      method: "GET",
      endpoint: "/api/printrove/orders",
      status: toStatus(ords.success, ords.latency_ms),
      message: ords.success
        ? `Fetched ${count} order(s) on page 1`
        : `HTTP ${ords.status} ${ords.statusText}`,
      latency_ms: ords.latency_ms,
    });
  } catch (error: any) {
    pushProbe(probes, {
      group: "Orders",
      name: "List Orders",
      method: "GET",
      endpoint: "/api/printrove/orders",
      status: "error",
      message: error.message || "Orders list failed",
    });
  }

  const summary = probes.reduce(
    (acc, p) => {
      if (p.status === "ok") acc.ok += 1;
      else if (p.status === "degraded") acc.degraded += 1;
      else if (p.status === "error") acc.error += 1;
      return acc;
    },
    { ok: 0, degraded: 0, error: 0 }
  );

  const status: ServiceStatus =
    summary.error > 0 ? "error" : summary.degraded > 0 ? "degraded" : "ok";

  return {
    status,
    timestamp: new Date().toISOString(),
    probes,
    summary,
  };
}
