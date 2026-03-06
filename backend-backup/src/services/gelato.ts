/**
 * Gelato API Service
 *
 * Service for Gelato Print-on-Demand API integration
 */

import { config } from "../config/index.js";

// Normalize base URL (remove trailing slash if present)
const normalizeBaseUrl = (url: string): string => {
  return url.replace(/\/+$/, "");
};

// Ecommerce API Base URL: https://ecommerce.gelatoapis.com/v1
const GELATO_ECOMMERCE_API_BASE_URL = normalizeBaseUrl(
  config.gelato.ecommerceApiBaseUrl || "https://ecommerce.gelatoapis.com/v1"
);

/**
 * Get template by ID from Gelato
 * Uses: GET https://ecommerce.gelatoapis.com/v1/templates/{templateId}
 *
 * @param templateId - Template ID from Gelato dashboard
 * @returns Template data including variants and image placeholders
 */
export const getTemplate = async (templateId: string): Promise<any> => {
  if (!config.gelato.apiKey) {
    throw new Error("Gelato API key is not configured");
  }

  const url = `${GELATO_ECOMMERCE_API_BASE_URL}/templates/${templateId}`;

  console.log("[Gelato Get Template] ========================================");
  console.log("[Gelato Get Template] Request URL:", url);
  console.log("[Gelato Get Template] Request Method: GET");
  console.log("[Gelato Get Template] Template ID:", templateId);
  console.log("[Gelato Get Template] Request Headers:", {
    "X-API-KEY": config.gelato.apiKey
      ? `${config.gelato.apiKey.substring(0, 10)}...`
      : "MISSING",
    "Content-Type": "application/json",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": config.gelato.apiKey!,
        "Content-Type": "application/json",
      },
    });

    console.log("[Gelato Get Template] Response Status:", response.status);
    console.log(
      "[Gelato Get Template] Response Status Text:",
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error("[Gelato Get Template] ❌ API Error Response:");
      console.error("[Gelato Get Template] Status:", response.status);
      console.error(
        "[Gelato Get Template] Error Data:",
        JSON.stringify(errorData, null, 2)
      );
      console.error("[Gelato Get Template] Raw Error Text:", errorText);
      console.error(
        "[Gelato Get Template] ========================================"
      );

      throw new Error(
        `Gelato API Error (${response.status}): ${
          errorData.message || errorData.error || "Unknown error"
        }`
      );
    }

    const contentType = response.headers.get("content-type");
    let data: any = null;

    if (contentType && contentType.includes("application/json")) {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;

      console.log("[Gelato Get Template] ✅ Success Response:");
      console.log(
        "[Gelato Get Template] Response Body:",
        JSON.stringify(data, null, 2)
      );
      console.log(
        "[Gelato Get Template] ========================================"
      );
    } else {
      console.log("[Gelato Get Template] Response Content-Type:", contentType);
      console.log("[Gelato Get Template] Non-JSON response received");
      console.log(
        "[Gelato Get Template] ========================================"
      );
    }

    return data;
  } catch (error: any) {
    console.error("[Gelato Get Template] ❌ Request Failed:");
    console.error("[Gelato Get Template] Error Message:", error.message);
    console.error("[Gelato Get Template] Error Stack:", error.stack);
    console.error(
      "[Gelato Get Template] ========================================"
    );
    throw error;
  }
};

export default {
  getTemplate,
};
