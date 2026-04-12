import { getPrintroveAccessToken } from "./auth.js";
import { config } from "../../config/index.js";

const getBaseUrl = () => config.printrove.baseUrl.replace(/\/$/, "");

async function callPrintroveApi(path: string) {
  const auth = await getPrintroveAccessToken();
  if (!auth.accessToken) {
    return {
      success: false,
      status: auth.status,
      statusText: auth.statusText,
      endpoint: auth.endpoint,
      data: auth.response,
      latency_ms: auth.latencyMs,
    };
  }

  const url = `${getBaseUrl()}${path}`;
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const raw = await response.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { raw_response: raw };
  }

  return {
    success: response.ok,
    status: response.status,
    statusText: response.statusText,
    endpoint: url,
    data: parsed,
    latency_ms: Date.now() - startedAt,
  };
}

export interface ListProductsParams {
  page?: number;
  per_page?: number;
  name?: string;
  sku?: string;
}

export async function listPrintroveProducts(params: ListProductsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.name) qs.set("name", params.name);
  if (params.sku) qs.set("sku", params.sku);
  const query = qs.toString();
  return callPrintroveApi(`/api/external/products${query ? `?${query}` : ""}`);
}

export async function getPrintroveProductById(productId: string) {
  return callPrintroveApi(`/api/external/products/${encodeURIComponent(productId)}`);
}
