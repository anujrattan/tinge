/**
 * Backend Server Entry Point
 *
 * Express.js API server with Supabase integration
 */

import express from "express";
import cors from "cors";
import compression from "compression";
import { config } from "./config/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { connectRedis } from "./services/redis.js";

// Routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import collectionRoutes from "./routes/collections.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import analyticsRoutes from "./routes/analytics.js";
import blogRoutes from "./routes/blog.js";
import faqRoutes from "./routes/faqs.js";
import userRoutes from "./routes/users.js";
import wishlistRoutes from "./routes/wishlists.js";
import ratingsRoutes from "./routes/ratings.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Enable gzip compression for all responses
app.use(compression());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wishlists", wishlistRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/faqs", faqRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;

// Connect to Redis (non-blocking)
connectRedis().catch((error) => {
  console.warn(
    "⚠️  Redis connection failed, continuing without cache:",
    error.message
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);

  // Log Razorpay configuration status
  if (config.razorpay.keyId && config.razorpay.keySecret) {
    console.log(
      `💳 Razorpay: Configured (Key ID: ${config.razorpay.keyId.substring(
        0,
        8
      )}...)`
    );
  } else {
    console.warn(
      `⚠️  Razorpay: Not configured - Payment features will not work`
    );
    console.warn(
      `   Please set RAZORPAY_TEST_API_KEY and RAZORPAY_TEST_API_KEY_SECRET for test mode`
    );
  }
});
