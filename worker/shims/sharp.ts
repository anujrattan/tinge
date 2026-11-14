/**
 * Sharp is a native Node addon and is not available on Cloudflare Workers.
 * This shim keeps the Worker bundle deployable; studio_local enhance returns a clear error.
 */

type SharpInstance = {
  metadata: () => Promise<{ width?: number; height?: number; format?: string }>;
  rotate: () => SharpInstance;
  resize: (..._args: unknown[]) => SharpInstance;
  sharpen: (..._args: unknown[]) => SharpInstance;
  normalize: () => SharpInstance;
  jpeg: (..._args: unknown[]) => SharpInstance;
  png: (..._args: unknown[]) => SharpInstance;
  webp: (..._args: unknown[]) => SharpInstance;
  toBuffer: () => Promise<Buffer>;
};

function unavailable(): never {
  throw new Error(
    "Sharp (studio_local upscaler) is not available on Cloudflare Workers. Use OpenRouter or fal, or run enhance locally."
  );
}

function createStub(): SharpInstance {
  const stub: SharpInstance = {
    metadata: async () => unavailable(),
    rotate: () => stub,
    resize: () => stub,
    sharpen: () => stub,
    normalize: () => stub,
    jpeg: () => stub,
    png: () => stub,
    webp: () => stub,
    toBuffer: async () => unavailable(),
  };
  return stub;
}

function sharp(_input?: Buffer | string, _opts?: unknown): SharpInstance {
  return createStub();
}

sharp.kernel = { lanczos3: "lanczos3" };

export default sharp;
