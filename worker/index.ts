/**
 * Cloudflare Worker entry — Express API via nodejs_compat + static SPA assets.
 * Static files are served by Workers Assets; /api/* and /health hit this handler.
 */

import { httpServerHandler } from "cloudflare:node";
import { createApp } from "../backend/src/app.js";
import { connectRedis } from "../backend/src/services/redis.js";

const PORT = 8787;
const app = createApp();

connectRedis().catch((error: Error) => {
  console.warn(
    "⚠️  Redis connection failed, continuing without cache:",
    error?.message ?? error
  );
});

app.listen(PORT);

export default httpServerHandler({ port: PORT });
