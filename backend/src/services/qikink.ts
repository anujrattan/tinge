/**
 * Qikink API Service
 *
 * Handles authentication and token management for Qikink API
 */

import { config } from "../config/index.js";
import { cache } from "./redis.js";

const QIKINK_TOKEN_CACHE_KEY = "qikink:access_token";
const QIKINK_TOKEN_EXPIRY_KEY = "qikink:token_expiry";

interface QikinkTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

/**
 * Get Qikink access token
 *
 * 1. Check Redis cache first
 * 2. If not found or expired, fetch new token from Qikink
 * 3. Store token in Redis with expiry using the expires_in value from API
 */
export async function getQikinkToken(
  forceRefresh: boolean = false
): Promise<string> {
  try {
    // If forced refresh, skip cache check
    if (!forceRefresh) {
      // Check if we have a cached token
      const cachedToken = await cache.get(QIKINK_TOKEN_CACHE_KEY);
      const cachedExpiry = await cache.get(QIKINK_TOKEN_EXPIRY_KEY);

      if (cachedToken && cachedExpiry) {
        const expiryTime = parseInt(cachedExpiry, 10);
        const now = Date.now();

        // If token hasn't expired (with 5 minute buffer), return cached token
        if (now < expiryTime - 5 * 60 * 1000) {
          console.log("✅ Using cached Qikink token");
          return cachedToken;
        }
      }
    }

    // Fetch new token (returns token and expiry info)
    console.log("🔄 Fetching new Qikink token...");
    const { token, expiresIn } = await fetchQikinkToken();

    // Store in cache with expiry (expiresIn is in seconds from API)
    await cache.set(QIKINK_TOKEN_CACHE_KEY, token, expiresIn || 3600);

    // Also store expiry timestamp for quick check
    const expiryTime = Date.now() + (expiresIn || 3600) * 1000;
    await cache.set(
      QIKINK_TOKEN_EXPIRY_KEY,
      expiryTime.toString(),
      expiresIn || 3600
    );

    console.log(
      `✅ Qikink token stored in cache (expires in ${expiresIn || 3600}s)`
    );
    return token;
  } catch (error: any) {
    console.error("❌ Error getting Qikink token:", error.message);
    throw error;
  }
}

/**
 * Fetch new access token from Qikink API
 * Returns token and expiry time
 */
async function fetchQikinkToken(): Promise<{
  token: string;
  expiresIn?: number;
}> {
  const { clientId, clientSecret, sandboxUrl } = config.qikink;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Qikink credentials not configured. Please set QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET in .env file."
    );
  }

  if (!sandboxUrl) {
    throw new Error(
      "Qikink sandbox URL not configured. Please set QIKINK_SANDBOX_URL in .env file."
    );
  }

  try {
    // According to Qikink API docs: https://documenter.getpostman.com/view/26157218/2sB3QKqpma
    // Authentication uses form-urlencoded with ClientId (capital C and I) and client_secret
    const formData = new URLSearchParams({
      ClientId: clientId, // Note: Capital C and I
      client_secret: clientSecret, // Note: lowercase c and underscore
    });

    console.log(`🔐 Authenticating with Qikink at: ${sandboxUrl}`);

    const response = await fetch(sandboxUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log(`📥 Qikink auth response status: ${response.status}`);
    console.log(
      `📥 Qikink auth response body: ${responseText.substring(0, 200)}`
    ); // Log first 200 chars

    if (!response.ok) {
      let errorMessage = `Qikink authentication failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${responseText}`;
      }

      throw new Error(errorMessage);
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "❌ Failed to parse Qikink response as JSON:",
        responseText
      );
      throw new Error(
        `Invalid JSON response from Qikink: ${responseText.substring(0, 100)}`
      );
    }

    // Check for access_token in response (Qikink uses "Accesstoken" - capital A, no underscore)
    const accessToken =
      data.Accesstoken || // Qikink uses this format
      data.access_token ||
      data.accessToken ||
      data.token ||
      data.Token;

    if (!accessToken) {
      console.error(
        "❌ Qikink response structure:",
        JSON.stringify(data, null, 2)
      );
      throw new Error(
        `Qikink authentication response missing access_token. Response: ${JSON.stringify(
          data
        )}`
      );
    }

    // Get expiry if provided (in seconds)
    const expiresIn = data.expires_in || data.expiresIn || 3600;

    console.log("✅ Qikink authentication successful");
    return { token: accessToken, expiresIn };
  } catch (error: any) {
    console.error("❌ Qikink authentication error:", error.message);
    throw error;
  }
}

/**
 * Clear cached Qikink token (useful for testing or if token becomes invalid)
 */
export async function clearQikinkToken(): Promise<void> {
  await cache.del(QIKINK_TOKEN_CACHE_KEY);
  await cache.del(QIKINK_TOKEN_EXPIRY_KEY);
  console.log("🗑️  Qikink token cleared from cache");
}

/**
 * Make an authenticated API request to Qikink
 * Automatically handles token refresh if token is expired
 *
 * @param endpoint - API endpoint (e.g., '/products')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Response data
 */
export async function qikinkRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl =
    config.qikink.sandboxUrl?.replace("/api/token", "") ||
    "https://sandbox.qikink.com";

  // Ensure endpoint starts with /
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  try {
    // Get token (from cache or fresh)
    const token = await getQikinkToken();

    // Make the request with token
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    // Check if token expired (401 Unauthorized)
    if (response.status === 401) {
      console.log("🔄 Token expired, refreshing...");

      // Clear cache and get new token
      await clearQikinkToken();
      const newToken = await getQikinkToken(true); // Force refresh

      // Retry the request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        let errorMessage = `Qikink API request failed: ${retryResponse.status} ${retryResponse.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const retryText = await retryResponse.text();
      return retryText ? JSON.parse(retryText) : ({} as T);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Qikink API request failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error: any) {
    console.error(
      `❌ Qikink API request error for ${endpoint}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Qikink Product Variant Interface
 */
export interface QikinkProductVariant {
  sku?: string;
  size?: string;
  color?: string;
  variant_id?: string;
  [key: string]: any; // Allow for additional fields from Qikink API
}

/**
 * Fetch product variants from Qikink API
 *
 * NOTE: Qikink API does not currently provide a public endpoint to fetch product variants.
 * This function will attempt common endpoint patterns, but will likely fail.
 *
 * RECOMMENDED APPROACH: Export SKUs from Qikink dashboard as CSV and use CSV import instead.
 *
 * @param qikinkProductId - The Qikink product identifier
 * @returns Array of variant objects with SKU, size, color information
 * @throws Error if no working endpoint is found (expected - use CSV import instead)
 */
export async function fetchQikinkProductVariants(
  qikinkProductId: string
): Promise<QikinkProductVariant[]> {
  try {
    // Try possible Qikink API endpoints for fetching product variants
    // Note: These endpoints may not exist in Qikink API
    const endpoints = [
      `/v1/products/${qikinkProductId}/variants`,
      `/v1/products/${qikinkProductId}`,
      `/products/${qikinkProductId}/variants`,
      `/products/${qikinkProductId}`,
      `/my-products/${qikinkProductId}`,
      `/v1/my-products/${qikinkProductId}`,
    ];

    const errors: string[] = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying Qikink endpoint: ${endpoint}`);
        const data = await qikinkRequest<{
          variants?: QikinkProductVariant[];
          data?: any;
        }>(endpoint);

        // Handle different response structures
        if (data.variants && Array.isArray(data.variants)) {
          console.log(`✅ Found variants at endpoint: ${endpoint}`);
          return data.variants;
        }
        if (data.data && Array.isArray(data.data)) {
          console.log(
            `✅ Found variants in data field at endpoint: ${endpoint}`
          );
          return data.data;
        }
        if (Array.isArray(data)) {
          console.log(`✅ Found variants array at endpoint: ${endpoint}`);
          return data;
        }

        // If response has variant information at root level
        if (data && typeof data === "object" && "variants" in data) {
          console.log(
            `✅ Found variants in response object at endpoint: ${endpoint}`
          );
          return (data as any).variants || [];
        }
      } catch (endpointError: any) {
        const errorMsg = `Endpoint ${endpoint}: ${endpointError.message}`;
        errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);

        // Continue to next endpoint if this one fails
        if (
          endpointError.message?.includes("404") ||
          endpointError.message?.includes("not found") ||
          endpointError.message?.includes("Not Found")
        ) {
          continue;
        }
        // For other errors, continue trying but log them
        continue;
      }
    }

    // If all endpoints failed, throw helpful error
    const errorMessage =
      `Qikink API does not provide an endpoint to fetch product variants.\n\n` +
      `Tried endpoints:\n${endpoints.map((e) => `  - ${e}`).join("\n")}\n\n` +
      `Errors:\n${errors.map((e) => `  - ${e}`).join("\n")}\n\n` +
      `RECOMMENDED SOLUTION:\n` +
      `1. Export your product variants from Qikink dashboard as CSV\n` +
      `2. Use the CSV import endpoint: POST /api/product-variants/:productId/import-from-csv\n` +
      `3. CSV format: size,color,sku\n\n` +
      `If you find the correct endpoint, please update fetchQikinkProductVariants() in qikink.ts`;

    throw new Error(errorMessage);
  } catch (error: any) {
    console.error(
      `❌ Error fetching Qikink product variants for ${qikinkProductId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Qikink Order Placement Interfaces
 */
export interface QikinkOrderLineItem {
  search_from_my_products: number; // 1 = use SKU, 0 = use design
  quantity: string;
  price: string;
  sku: string;
  designs?: QikinkOrderDesign[]; // Optional when search_from_my_products is 1
}

export interface QikinkOrderDesign {
  design_code?: string;
  width_inches?: string;
  height_inches?: string;
  placement_sku?: string;
  design_link?: string;
  mockup_link?: string;
}

export interface QikinkShippingAddress {
  first_name: string;
  last_name: string;
  address1: string;
  phone: string;
  email: string;
  city: string;
  zip: string;
  province: string;
  country_code: string;
}

export interface QikinkOrderRequest {
  order_number: string;
  qikink_shipping: number; // 0 = self shipping, 1 = Qikink handles shipping
  gateway: string; // "COD" or "Prepaid"
  total_order_value: string;
  line_items: QikinkOrderLineItem[];
  shipping_address: QikinkShippingAddress;
}

export interface QikinkOrderResponse {
  order_number?: string;
  qikink_order_id?: string;
  status?: string;
  message?: string;
  [key: string]: any; // Allow for additional fields
}

/**
 * Place an order with Qikink
 *
 * @param orderData - Order data to send to Qikink
 * @returns Qikink order response
 */
export async function placeQikinkOrder(
  orderData: QikinkOrderRequest
): Promise<QikinkOrderResponse> {
  try {
    // Get token for authentication
    const token = await getQikinkToken();
    const { clientId } = config.qikink;

    const baseUrl =
      config.qikink.sandboxUrl?.replace("/api/token", "") ||
      "https://sandbox.qikink.com";
    const url = `${baseUrl}/api/order/create`;

    console.log(`📦 Placing order with Qikink: ${orderData.order_number}`);

    // Make the order creation request
    // Note: Based on the example, we use ClientId and Accesstoken headers
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ClientId: clientId || "",
        Accesstoken: token, // Qikink uses Accesstoken header (capital A)
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Qikink order creation failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${responseText}`;
      }

      console.error(`❌ Qikink order creation failed:`, errorMessage);
      throw new Error(errorMessage);
    }

    let data: QikinkOrderResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "❌ Failed to parse Qikink order response as JSON:",
        responseText
      );
      throw new Error(
        `Invalid JSON response from Qikink: ${responseText.substring(0, 100)}`
      );
    }

    console.log(`✅ Qikink order created: ${orderData.order_number}`);
    return data;
  } catch (error: any) {
    console.error("❌ Error placing Qikink order:", error.message);
    throw error;
  }
}
