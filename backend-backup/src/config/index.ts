/**
 * Backend Configuration
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the backend root directory (2 levels up from src/config)
const backendRoot = join(__dirname, "../..");
const envLocalPath = join(backendRoot, ".env");

// Load environment variables from .env file in backend directory
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  // Fallback: try current working directory (for development)
  dotenv.config({ path: ".env" });
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3001/api",

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "30m", // 30 minutes session timeout
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    // Cache TTL in seconds (default: 1 hour)
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || "3600", 10),
  },

  // Gelato Print-on-Demand API configuration
  // Gelato uses different base URLs for different services:
  // - Ecommerce: https://ecommerce.gelatoapis.com/v1 (for templates, products)
  // - Orders: https://order.gelatoapis.com/v4
  // - Products/Catalogs: https://product.gelatoapis.com/v3
  // - Shipments: https://shipment.gelatoapis.com/v1
  gelato: {
    apiKey: process.env.GELATO_API_KEY || "",
    storeId: process.env.GELATO_STORE_ID || "",
    // Base URLs for different Gelato API services
    ecommerceApiBaseUrl:
      process.env.GELATO_ECOMMERCE_API_BASE_URL ||
      "https://ecommerce.gelatoapis.com/v1",
    orderApiBaseUrl:
      process.env.GELATO_ORDER_API_BASE_URL ||
      "https://order.gelatoapis.com/v4",
    productApiBaseUrl:
      process.env.GELATO_PRODUCT_API_BASE_URL ||
      "https://product.gelatoapis.com/v3",
    shipmentApiBaseUrl:
      process.env.GELATO_SHIPMENT_API_BASE_URL ||
      "https://shipment.gelatoapis.com/v1",
    // Legacy: kept for backward compatibility, defaults to order API
    apiBaseUrl:
      process.env.GELATO_API_BASE_URL ||
      "https://order.gelatoapis.com/v4",
    // Webhook secret for verifying Gelato webhook requests
    webhookSecret: process.env.GELATO_WEBHOOK_SECRET || "",
    // Ngrok URL for local webhook development (optional)
    ngrokUrl: process.env.NGROK_URL || "",
  },
};
