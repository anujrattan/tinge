/**
 * Backend Server Entry Point
 */

import { config } from "./config/index.js";
import { app } from "./app.js";
import { connectRedis } from "./services/redis.js";

const PORT = config.port;

connectRedis().catch((error) => {
  console.warn(
    "⚠️  Redis connection failed, continuing without cache:",
    error.message
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);

  if (config.razorpay.keyId && config.razorpay.keySecret) {
    console.log(
      `💳 Razorpay: Configured (Key ID: ${config.razorpay.keyId.substring(0, 8)}...)`
    );
  } else {
    console.warn(`⚠️  Razorpay: Not configured — payment features disabled`);
  }
});
