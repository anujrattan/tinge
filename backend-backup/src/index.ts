/**
 * Backend Server Entry Point
 *
 * Express.js API server with Supabase integration
 */

import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { getRedisClient } from "./services/redis.js";

// Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import gelatoRoutes from "./routes/gelato.js";

const app = express();

// Initialize Redis connection
getRedisClient().catch((err) => {
  console.error("Failed to connect to Redis:", err);
  console.warn(
    "⚠️  Continuing without Redis cache. Some features may be slower."
  );
});

// Middleware
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

// Store raw body for webhook signature verification (must be before JSON parser)
// This middleware captures raw body for webhook endpoints
app.use(
  "/api/gelato/webhooks",
  express.raw({ type: "application/json", limit: "10mb" })
);

// Increase body size limit to handle base64 image uploads (10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/gelato", gelatoRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});
