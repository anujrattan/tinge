/**
 * AI Image Enhancement & Mockup Service
 *
 * Provider-agnostic pipeline for Admin print-prep (upscaling, denoising, cleaning):
 *  1. OpenRouter (when OPENROUTER_API_KEY is set and provider !== 'studio_local')
 *  2. fal.ai (when FAL_KEY is set and provider === 'fal' or OpenRouter unset)
 *  3. Studio Local (Sharp Lanczos3 2x/4x upscaler + print sharpening/denoise — always free)
 */

import sharp from 'sharp';
import { config } from '../config/index.js';

export type EnhanceAction = 'upscale_2x' | 'upscale_4x' | 'clean' | 'print_prep';
export type AiProviderChoice = 'auto' | 'openrouter' | 'fal' | 'studio_local';

export interface EnhanceResult {
  buffer: Buffer;
  contentType: string;
  providerUsed: 'openrouter' | 'fal' | 'studio_local';
  notes: string;
  width?: number;
  height?: number;
}

export function getAvailableAiProviders() {
  return {
    openrouterConfigured: Boolean(config.ai.openrouterApiKey),
    openrouterModel: config.ai.openrouterImageModel,
    falConfigured: Boolean(config.ai.falKey),
    studioLocalAvailable: true,
  };
}

function buildActionPrompt(action: EnhanceAction, customPrompt?: string): string {
  if (customPrompt?.trim()) return customPrompt.trim();
  switch (action) {
    case 'upscale_2x':
    case 'upscale_4x':
      return 'Upscale and sharpen this artwork for large-format gallery printing. Preserve every detail, colour, and composition faithfully while removing JPEG artifacts and blur.';
    case 'clean':
      return 'Clean compression artifacts, dust, scratches, and noise from this artwork while keeping the exact design, lines, and colours intact for printing.';
    case 'print_prep':
    default:
      return 'Prepare this image for high-resolution wall art printing: denoise, crisp edges, balanced contrast, zero artifacts, faithful to the original artwork.';
  }
}

async function enhanceViaOpenRouter(
  imageBuffer: Buffer,
  contentType: string,
  action: EnhanceAction,
  customPrompt?: string,
): Promise<EnhanceResult> {
  const apiKey = config.ai.openrouterApiKey;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const dataUrl = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
  const prompt = buildActionPrompt(action, customPrompt);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.frontendUrl,
      'X-Title': 'Tinge Studio Print Prep',
    },
    body: JSON.stringify({
      model: config.ai.openrouterImageModel,
      modalities: ['image', 'text'],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  const json: any = await response.json();
  const msg = json?.choices?.[0]?.message;
  const imageOut =
    msg?.images?.[0]?.image_url?.url ||
    msg?.images?.[0]?.url ||
    (Array.isArray(msg?.content)
      ? msg.content.find((c: any) => c?.type === 'image_url')?.image_url?.url
      : null);

  if (!imageOut || typeof imageOut !== 'string') {
    throw new Error('OpenRouter did not return an output image');
  }

  let outBuf: Buffer;
  let outMime = 'image/png';
  if (imageOut.startsWith('data:')) {
    const match = imageOut.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid base64 image from OpenRouter');
    outMime = match[1];
    outBuf = Buffer.from(match[2], 'base64');
  } else {
    const dl = await fetch(imageOut);
    if (!dl.ok) throw new Error(`Failed to fetch OpenRouter result image (${dl.status})`);
    outMime = dl.headers.get('content-type') || 'image/png';
    outBuf = Buffer.from(await dl.arrayBuffer());
  }

  const meta = await sharp(outBuf).metadata();
  return {
    buffer: outBuf,
    contentType: outMime,
    providerUsed: 'openrouter',
    notes: `Enhanced via OpenRouter (${config.ai.openrouterImageModel})`,
    width: meta.width,
    height: meta.height,
  };
}

async function enhanceViaFal(
  imageBuffer: Buffer,
  contentType: string,
  action: EnhanceAction,
): Promise<EnhanceResult> {
  const falKey = config.ai.falKey;
  if (!falKey) throw new Error('FAL_KEY is not configured');

  const dataUrl = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
  const scale = action === 'upscale_4x' ? 4 : 2;

  const response = await fetch('https://fal.run/fal-ai/aura-sr', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: dataUrl,
      upscaling_factor: scale === 4 ? 4 : 2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`fal.ai upscale failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  const json: any = await response.json();
  const outUrl = json?.image?.url;
  if (!outUrl) throw new Error('fal.ai returned no image URL');

  const dl = await fetch(outUrl);
  if (!dl.ok) throw new Error(`Failed to download fal.ai image (${dl.status})`);
  const outBuf = Buffer.from(await dl.arrayBuffer());
  const outMime = dl.headers.get('content-type') || 'image/png';
  const meta = await sharp(outBuf).metadata();

  return {
    buffer: outBuf,
    contentType: outMime,
    providerUsed: 'fal',
    notes: `Upscaled ${scale}× via fal.ai (aura-sr)`,
    width: meta.width,
    height: meta.height,
  };
}

async function enhanceViaStudioLocal(
  imageBuffer: Buffer,
  action: EnhanceAction,
): Promise<EnhanceResult> {
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const origW = meta.width || 1200;
  const origH = meta.height || 1200;

  let pipeline = image;
  let notes = '';

  if (action === 'upscale_2x' || action === 'upscale_4x') {
    const factor = action === 'upscale_4x' ? 4 : 2;
    // Cap max dimension at 6000px so memory & storage remain snappy
    const maxDim = 6000;
    const scale = Math.min(factor, maxDim / Math.max(origW, origH));
    const targetW = Math.max(origW, Math.round(origW * scale));
    const targetH = Math.max(origH, Math.round(origH * scale));

    pipeline = pipeline
      .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
      .median(1)
      .sharpen({ sigma: 1.15, m1: 0.9, m2: 2.0 });
    notes = `Studio Lanczos3 ${factor}× upscale (${origW}×${origH} → ${targetW}×${targetH} px) + print sharpen`;
  } else if (action === 'clean') {
    pipeline = pipeline
      .median(3)
      .sharpen({ sigma: 0.9, m1: 0.6, m2: 1.6 });
    notes = `Studio denoise & artifact clean (${origW}×${origH} px)`;
  } else {
    const targetW = Math.min(4800, Math.max(origW, Math.round(origW * 2)));
    pipeline = pipeline
      .resize(targetW, undefined, { kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
      .median(1)
      .normalize({ lower: 1, upper: 99 })
      .sharpen({ sigma: 1.0, m1: 0.8, m2: 1.8 });
    notes = `Studio print-prep upscale + tone normalize + sharpen`;
  }

  const outBuf = await pipeline.png({ compressionLevel: 6 }).toBuffer();
  const outMeta = await sharp(outBuf).metadata();

  return {
    buffer: outBuf,
    contentType: 'image/png',
    providerUsed: 'studio_local',
    notes,
    width: outMeta.width,
    height: outMeta.height,
  };
}

export async function enhanceCustomArtwork(params: {
  imageBuffer: Buffer;
  contentType: string;
  action: EnhanceAction;
  provider?: AiProviderChoice;
  customPrompt?: string;
}): Promise<EnhanceResult> {
  const choice = params.provider || 'auto';

  if (choice === 'openrouter') {
    return enhanceViaOpenRouter(params.imageBuffer, params.contentType, params.action, params.customPrompt);
  }
  if (choice === 'fal') {
    return enhanceViaFal(params.imageBuffer, params.contentType, params.action);
  }
  if (choice === 'studio_local') {
    return enhanceViaStudioLocal(params.imageBuffer, params.action);
  }

  // Auto: prefer OpenRouter if configured, then fal.ai, else Studio Local (always free)
  if (config.ai.openrouterApiKey) {
    try {
      return await enhanceViaOpenRouter(params.imageBuffer, params.contentType, params.action, params.customPrompt);
    } catch (err) {
      console.warn('OpenRouter enhance failed, falling back:', err);
    }
  }
  if (config.ai.falKey) {
    try {
      return await enhanceViaFal(params.imageBuffer, params.contentType, params.action);
    } catch (err) {
      console.warn('fal.ai enhance failed, falling back to Studio Local:', err);
    }
  }
  return enhanceViaStudioLocal(params.imageBuffer, params.action);
}
