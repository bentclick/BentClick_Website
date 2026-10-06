import { readFile } from "node:fs/promises";
import path from "node:path";
import * as opentypeModule from "opentype.js";
import sharp from "sharp";

// Bundlers load the ESM build (named exports only); plain Node loads the UMD build (exports on default).
const opentype: typeof opentypeModule = (opentypeModule as unknown as { default?: typeof opentypeModule }).default ?? opentypeModule;

export type WatermarkPosition = "CENTER" | "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT";

export type WatermarkSpec = {
  type: "TEXT" | "IMAGE";
  text: string | null;
  image: Buffer | null; // PNG/WebP logo bytes for IMAGE marks
  color: string; // #RRGGBB, text marks
  opacity: number; // 0..1
  size: number; // fraction of the image's shorter side (0.05..0.8)
  position: WatermarkPosition;
  margin: number; // px at preview resolution
  tile: boolean;
};

// Vercel's image runtime has no system fonts, so text is drawn as vector paths
// from a bundled font (Cormorant Garamond 500, SIL OFL 1.1).
const FONT_PATH = path.join(process.cwd(), "src/assets/fonts/cormorant-garamond-500.woff");
let fontPromise: Promise<opentypeModule.Font> | null = null;
function loadFont() {
  fontPromise ??= readFile(FONT_PATH).then((b) => opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  return fontPromise;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const safeColor = (c: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#FFFFFF");

/** The mark itself as a transparent PNG, `width` px wide. */
async function renderMark(spec: WatermarkSpec, width: number): Promise<{ png: Buffer; width: number; height: number }> {
  const opacity = clamp(spec.opacity, 0.05, 1);
  if (spec.type === "IMAGE" && spec.image) {
    const logo = sharp(spec.image).ensureAlpha().resize({ width, withoutEnlargement: false });
    const resized = await logo.png().toBuffer({ resolveWithObject: true });
    // Scale alpha by opacity (dest-in with a 1×1 tiled pixel of that alpha).
    const faded = await sharp(resized.data)
      .composite([{ input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
      .png()
      .toBuffer();
    return { png: faded, width: resized.info.width, height: resized.info.height };
  }

  const text = (spec.text ?? "").trim() || "BentClick";
  const font = await loadFont();
  const probe = font.getPath(text, 0, 100, 100).getBoundingBox();
  const fontSize = (100 * width) / Math.max(1, probe.x2 - probe.x1);
  const glyphs = font.getPath(text, 0, fontSize, fontSize);
  const box = glyphs.getBoundingBox();
  const w = Math.ceil(box.x2 - box.x1) + 4;
  const h = Math.ceil(box.y2 - box.y1) + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g transform="translate(${2 - box.x1} ${2 - box.y1})"><path d="${glyphs.toPathData(2)}" fill="${safeColor(spec.color)}" fill-opacity="${opacity}"/></g></svg>`;
  return { png: await sharp(Buffer.from(svg)).png().toBuffer(), width: w, height: h };
}

/** Composites the mark onto a preview and returns a WebP. Originals never pass through here. */
export async function applyWatermark(preview: Buffer, spec: WatermarkSpec): Promise<Buffer> {
  const base = sharp(preview);
  const { width = 0, height = 0 } = await base.metadata();
  if (!width || !height) return preview;

  const shorter = Math.min(width, height);
  const markWidth = Math.round(shorter * clamp(spec.size, 0.05, 0.8) * (spec.type === "TEXT" ? 1.6 : 1));
  const mark = await renderMark(spec, Math.max(16, Math.min(markWidth, width)));
  const margin = Math.max(0, Math.round(spec.margin));

  if (spec.tile) {
    // Repeat with breathing room between copies.
    const pad = Math.round(mark.width * 0.3); // whole pixels: sharp rejects fractions
    const cell = await sharp(mark.png)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return base.composite([{ input: cell, tile: true, gravity: "northwest" }]).webp({ quality: 82 }).toBuffer();
  }

  const left = { CENTER: (width - mark.width) / 2, TOP_LEFT: margin, BOTTOM_LEFT: margin, TOP_RIGHT: width - mark.width - margin, BOTTOM_RIGHT: width - mark.width - margin }[spec.position];
  const top = { CENTER: (height - mark.height) / 2, TOP_LEFT: margin, TOP_RIGHT: margin, BOTTOM_LEFT: height - mark.height - margin, BOTTOM_RIGHT: height - mark.height - margin }[spec.position];
  return base
    .composite([{ input: mark.png, left: Math.round(clamp(left, 0, width - mark.width)), top: Math.round(clamp(top, 0, height - mark.height)) }])
    .webp({ quality: 82 })
    .toBuffer();
}

/** Identifies which watermark look a preview was rendered with. */
export function watermarkStamp(watermark: { id: string; version: number } | null): string | null {
  return watermark ? `${watermark.id}:${watermark.version}` : null;
}
