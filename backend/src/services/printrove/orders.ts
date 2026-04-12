import { getPrintroveAccessToken } from "./auth.js";
import { config } from "../../config/index.js";

const getBaseUrl = () => config.printrove.baseUrl.replace(/\/$/, "");

async function callGet(path: string) {
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

async function callPost(path: string, body: any) {
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
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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

// ── Pincode Details ───────────────────────────────────────────────────────────

export async function getPrintrovePincodeDetails(pincode: string) {
  return callGet(`/api/external/pincode/${encodeURIComponent(pincode)}`);
}

// ── Serviceability ────────────────────────────────────────────────────────────

export interface ServiceabilityParams {
  country: string;
  pincode: string;
  weight: string;
  /** Printrove requires this query param; omitting it returns 422. */
  cod?: string;
}

export async function checkPrintroveServiceability(params: ServiceabilityParams) {
  const qs = new URLSearchParams();
  qs.set("country", params.country);
  qs.set("pincode", params.pincode);
  qs.set("weight", params.weight);
  const codTrue =
    params.cod === "true" ||
    params.cod === "1" ||
    String(params.cod).toLowerCase() === "true";
  qs.set("cod", codTrue ? "true" : "false");
  return callGet(`/api/external/serviceability?${qs.toString()}`);
}

// ── List Orders ───────────────────────────────────────────────────────────────

export interface ListOrdersParams {
  page?: number;
  per_page?: number;
  tracking_number?: string;
  reference_number?: string;
}

export async function listPrintroveOrders(params: ListOrdersParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.tracking_number) qs.set("tracking_number", params.tracking_number);
  if (params.reference_number) qs.set("reference_number", params.reference_number);
  const query = qs.toString();
  return callGet(`/api/external/orders${query ? `?${query}` : ""}`);
}

// ── Get Order by ID ───────────────────────────────────────────────────────────

export async function getPrintroveOrderById(orderId: string) {
  return callGet(`/api/external/orders/${encodeURIComponent(orderId)}`);
}

// ── Create Order ──────────────────────────────────────────────────────────────

export async function createPrintroveOrder(payload: any) {
  return callPost("/api/external/orders", payload);
}
