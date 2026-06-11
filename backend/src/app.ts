/**
 * Express application factory (exported for tests and server entry).
 */

import express from "express";
import cors from "cors";
import compression from "compression";
import { config } from "./config/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

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
import colorRoutes from "./routes/colors.js";
import printroveRoutes from "./routes/printrove.js";
import healthRoutes from "./routes/health.js";
import newsletterRoutes from "./routes/newsletter.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(compression());

  // Liveness (used by load balancers / uptime monitors)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/collections", collectionRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/wishlists", wishlistRoutes);
  app.use("/api/ratings", ratingsRoutes);
  app.use("/api/colors", colorRoutes);
  app.use("/api/printrove", printroveRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/faqs", faqRoutes);
  app.use("/api/newsletter", newsletterRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
