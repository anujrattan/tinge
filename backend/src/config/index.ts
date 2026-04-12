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
    url: process.env._URL || "redis://localhost:6379",
  },

  // Qikink API configuration
  qikink: {
    clientId: process.env.QIKINK_CLIENT_ID || "",
    clientSecret: process.env.QIKINK_CLIENT_SECRET || "",
    sandboxUrl: process.env.QIKINK_SANDBOX_URL || "",
  },

  // Printrove API configuration
  printrove: {
    baseUrl: process.env.PRINTROVE_BASE_URL || "https://api.printrove.com",
    email: process.env.PRINTROVE_EMAIL || "rattan.anuj@gmail.com",
    password: process.env.PRINTROVE_PASSWORD || "Nov@2025",
  },

  // Razorpay configuration
  razorpay: {
    keyId:
      process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_TEST_API_KEY_ID ||
      process.env.RAZORPAY_TEST_API_KEY ||
      "",
    keySecret:
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_TEST_API_KEY_SECRET ||
      "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  },

  // Resend email configuration
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    // For testing, you can use Resend's default onboarding sender
    // or set RESEND_FROM_EMAIL in your .env to a verified sender.
    fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    adminEmail: process.env.RESEND_ADMIN_EMAIL || "",
  },
};
