import { config } from "../../config/index.js";
import { getPrintroveAccessToken } from "./auth.js";

const getBaseUrl = () => config.printrove.baseUrl.replace(/\/$/, "");

async function callPrintroveCatalogApi(path: string) {
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

export async function listPrintroveCategories() {
  return callPrintroveCatalogApi("/api/external/categories");
}

export async function getPrintroveCategoryParentProducts(categoryId: string) {
  return callPrintroveCatalogApi(`/api/external/categories/${encodeURIComponent(categoryId)}`);
}

export async function getPrintroveProductVariants(categoryId: string, productId: string) {
  return callPrintroveCatalogApi(
    `/api/external/categories/${encodeURIComponent(categoryId)}/products/${encodeURIComponent(productId)}`
  );
}

