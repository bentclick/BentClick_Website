import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyWatermark, type WatermarkSpec, watermarkStamp } from "./watermark";

async function plain(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 40, g: 40, b: 40 } } }).webp().toBuffer();
}

async function brightPixels(buf: Buffer) {
  const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 3) if (data[i]! > 150) n++;
  return n;
}

const spec: WatermarkSpec = { type: "TEXT", text: "BentClick", image: null, color: "#FFFFFF", opacity: 0.9, size: 0.3, position: "BOTTOM_RIGHT", margin: 24, tile: false };

describe("applyWatermark", () => {
  it("draws a text mark onto the preview, keeping its size", async () => {
    const base = await plain(1200, 800);
    const out = await applyWatermark(base, spec);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 800, "webp"]);
    expect(await brightPixels(out)).toBeGreaterThan(500);
    expect(await brightPixels(base)).toBe(0);
  });

  it("places corner marks in their corner", async () => {
    const out = await applyWatermark(await plain(1200, 800), spec);
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const bright = (x0: number, y0: number, x1: number, y1: number) => {
      let n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (data[(y * 1200 + x) * 3]! > 150) n++;
      return n;
    };
    expect(bright(600, 400, 1200, 800)).toBeGreaterThan(0); // bottom-right quadrant
    expect(bright(0, 0, 600, 400)).toBe(0); // top-left stays clean
  });

  it("tiles across the whole image", async () => {
    const out = await applyWatermark(await plain(1200, 800), { ...spec, tile: true, size: 0.12 });
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    let topLeft = 0;
    for (let y = 0; y < 400; y++) for (let x = 0; x < 600; x++) if (data[(y * 1200 + x) * 3]! > 150) topLeft++;
    expect(topLeft).toBeGreaterThan(0);
  });

  it("applies image marks with opacity", async () => {
    const logo = await sharp({ create: { width: 200, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
    const out = await applyWatermark(await plain(1000, 1000), { ...spec, type: "IMAGE", image: logo, opacity: 0.5, position: "CENTER" });
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const center = data[(500 * 1000 + 500) * 3]!;
    expect(center).toBeGreaterThan(110); // blended, not pure white
    expect(center).toBeLessThan(200);
  });
});

describe("watermarkStamp", () => {
  it("encodes id and version", () => {
    expect(watermarkStamp({ id: "w1", version: 3 })).toBe("w1:3");
    expect(watermarkStamp(null)).toBeNull();
  });
});
