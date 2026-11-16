/**
 * Minimal iconv-lite shim for Cloudflare Workers bundling.
 * Express body-parser imports iconv-lite; the real package breaks under wrangler esbuild.
 */

function toBuffer(input: string | Buffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(String(input));
}

export function decode(buffer: Buffer | string, encoding?: string, _options?: unknown): string {
  const buf = toBuffer(buffer as Buffer);
  const enc = (encoding || "utf8").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (enc === "utf8" || enc === "utf-8" || enc === "ascii" || enc === "latin1" || enc === "binary") {
    return buf.toString(enc === "utf-8" ? "utf8" : (enc as BufferEncoding));
  }
  // Best-effort fallback for uncommon encodings in API JSON bodies.
  return buf.toString("utf8");
}

export function encode(content: string, encoding?: string, _options?: unknown): Buffer {
  const enc = (encoding || "utf8").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (enc === "utf8" || enc === "utf-8" || enc === "ascii" || enc === "latin1" || enc === "binary") {
    return Buffer.from(content, enc === "utf-8" ? "utf8" : (enc as BufferEncoding));
  }
  return Buffer.from(content, "utf8");
}

export function encodingExists(_encoding: string): boolean {
  return true;
}

export function decodeStream(_encoding?: string, _options?: unknown) {
  throw new Error("iconv-lite decodeStream is not available on Cloudflare Workers");
}

export function encodeStream(_encoding?: string, _options?: unknown) {
  throw new Error("iconv-lite encodeStream is not available on Cloudflare Workers");
}

export default {
  decode,
  encode,
  encodingExists,
  decodeStream,
  encodeStream,
};
