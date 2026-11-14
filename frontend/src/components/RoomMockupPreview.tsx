import React from 'react';
import { formatPosterSizeLabel } from '../utils/sizeSystem';

export type MockupMaterial = 'framed_acp' | 'canvas' | 'sunboard' | 'neon' | string;

interface RoomMockupPreviewProps {
  image?: string;
  neonText?: string;
  material?: MockupMaterial;
  sizeLabel?: string;
  title?: string;
  className?: string;
}

/** Parse "6 × 4 FT" / "24x36 in" into feet. */
export const parseSizeFeet = (label?: string): { w: number; h: number } | null => {
  if (!label) return null;
  const m = label.match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(ft|in|cm)?/i);
  if (!m) return null;
  const unit = (m[3] || 'ft').toLowerCase();
  const factor = unit === 'in' ? 1 / 12 : unit === 'cm' ? 1 / 30.48 : 1;
  const w = parseFloat(m[1]) * factor;
  const h = parseFloat(m[2]) * factor;
  if (!w || !h) return null;
  return { w, h };
};

/**
 * Compute artwork placement (%) inside our 4:3 photorealistic room scenes.
 * Both scenes keep the sofa centered left-of-middle (~43% X) and a side table
 * with a ceramic/glass vase + flowers on the right.
 * Wall spans ~12.5 ft wide horizontally in the 4:3 frame.
 */
function getPlacement(material?: MockupMaterial, sizeLabel?: string) {
  const isNeon = material === 'neon';
  const dims = parseSizeFeet(sizeLabel) || (isNeon ? { w: 3.5, h: 1.8 } : { w: 4, h: 3 });

  const wallWidthFt = 12.5;
  // Cap so huge sizes (like 6x4) stay well inside the blank wall above the sofa
  const widthPct = Math.min(46, Math.max(18, (dims.w / wallWidthFt) * 100));
  // 4:3 container => vertical scale is 4/3 of horizontal scale
  const heightPct = Math.min(44, Math.max(14, (dims.h / wallWidthFt) * (4 / 3) * 100));

  const centerX = isNeon ? 42 : 44;
  const bottomY = isNeon ? 61 : 55;
  const left = centerX - widthPct / 2;
  const top = Math.max(8, bottomY - heightPct);

  return { left, top, width: widthPct, height: heightPct, isNeon };
}

/**
 * Photorealistic room preview (warm plaster wall, linen sofa, oak side table,
 * ceramic vase & flowers; or moody dark room for neon) with the piece placed
 * at true visual scale and material finish.
 */
export const RoomMockupPreview: React.FC<RoomMockupPreviewProps> = ({
  image,
  neonText,
  material,
  sizeLabel,
  title,
  className = '',
}) => {
  const { left, top, width, height, isNeon } = getPlacement(material, sizeLabel);
  const bgSrc = isNeon ? '/mockups/room-neon.jpg' : '/mockups/room-daylight.jpg';
  const displaySize = sizeLabel ? formatPosterSizeLabel(sizeLabel) : '';

  const frameClass =
    material === 'framed_acp'
      ? 'border-[5px] sm:border-[6px] border-[#181615] bg-[#181615] shadow-[0_18px_36px_-10px_rgba(0,0,0,0.48),0_4px_10px_rgba(0,0,0,0.28)]'
      : material === 'canvas'
        ? 'border-r-[4px] border-b-[4px] border-[#d7d0c5] shadow-[0_16px_30px_-10px_rgba(0,0,0,0.42)]'
        : material === 'sunboard'
          ? 'border border-black/10 shadow-[0_10px_22px_-8px_rgba(0,0,0,0.34)]'
          : '';

  return (
    <figure className={className}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-wall">
        <img
          src={bgSrc}
          alt={
            isNeon
              ? 'Moody living room wall above sofa with walnut side table, vase and flowers'
              : 'Sunlit living room wall above sofa with oak side table, vase and flowers'
          }
          className="h-full w-full object-cover select-none"
          loading="lazy"
        />

        {/* Placed artwork / neon */}
        <div
          className={`absolute motion-safe:transition-all motion-safe:duration-300 ${frameClass}`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        >
          {isNeon && neonText && !image ? (
            <div className="flex h-full w-full items-center justify-center p-2 text-center">
              <span
                className="font-playfair italic text-[clamp(14px,2.8vw,28px)] leading-tight text-[#FFE9D6]"
                style={{
                  textShadow:
                    '0 0 8px rgba(255,122,89,0.95), 0 0 22px rgba(255,122,89,0.75), 0 0 42px rgba(255,94,98,0.55)',
                }}
              >
                {neonText}
              </span>
            </div>
          ) : image ? (
            <div className="relative h-full w-full overflow-hidden">
              <img
                src={image}
                alt={title ? `${title} shown in room` : 'Artwork room preview'}
                className={`h-full w-full object-cover ${
                  isNeon ? 'drop-shadow-[0_0_22px_rgba(255,122,89,0.65)]' : ''
                }`}
              />
              {/* Subtle glass gloss on Framed ACP */}
              {material === 'framed_acp' && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(125deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 34%, transparent 55%)',
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
      <figcaption className="mt-2.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary">
        <span>In-room preview{displaySize ? ` · ${displaySize}` : ''}</span>
        <span>Above 7 ft sofa</span>
      </figcaption>
    </figure>
  );
};

/**
 * Render the same photorealistic room mockup into a JPEG Blob on an offscreen
 * canvas so Your Art uploads can persist a real mockup file to Supabase Storage.
 */
export async function renderRoomMockupBlob(opts: {
  artworkDataUrlOrSrc: string;
  material?: MockupMaterial;
  sizeLabel?: string;
}): Promise<Blob | null> {
  const { left, top, width, height, isNeon } = getPlacement(opts.material, opts.sizeLabel);
  const bgSrc = isNeon ? '/mockups/room-neon.jpg' : '/mockups/room-daylight.jpg';

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  try {
    const [bgImg, artImg] = await Promise.all([
      loadImage(bgSrc),
      loadImage(opts.artworkDataUrlOrSrc),
    ]);

    const canvas = document.createElement('canvas');
    const W = 1200;
    const H = 900;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bgImg, 0, 0, W, H);

    const x = (left / 100) * W;
    const y = (top / 100) * H;
    const w = (width / 100) * W;
    const h = (height / 100) * H;

    ctx.save();
    ctx.shadowColor = isNeon ? 'rgba(255, 122, 89, 0.55)' : 'rgba(0, 0, 0, 0.36)';
    ctx.shadowBlur = isNeon ? 28 : 26;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = isNeon ? 0 : 14;

    if (opts.material === 'framed_acp') {
      const frame = 10;
      ctx.fillStyle = '#181615';
      ctx.fillRect(x - frame, y - frame, w + frame * 2, h + frame * 2);
    } else if (opts.material === 'canvas') {
      ctx.fillStyle = '#d7d0c5';
      ctx.fillRect(x + 5, y + 5, w, h);
    }

    ctx.shadowColor = 'transparent';
    // Cover-crop artwork into frame rectangle
    const imgAspect = artImg.width / artImg.height;
    const boxAspect = w / h;
    let sx = 0,
      sy = 0,
      sw = artImg.width,
      sh = artImg.height;
    if (imgAspect > boxAspect) {
      sw = artImg.height * boxAspect;
      sx = (artImg.width - sw) / 2;
    } else {
      sh = artImg.width / boxAspect;
      sy = (artImg.height - sh) / 2;
    }
    ctx.drawImage(artImg, sx, sy, sw, sh, x, y, w, h);

    if (opts.material === 'framed_acp') {
      const grad = ctx.createLinearGradient(x, y, x + w * 0.7, y + h * 0.7);
      grad.addColorStop(0, 'rgba(255,255,255,0.14)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9),
    );
  } catch {
    return null;
  }
}
