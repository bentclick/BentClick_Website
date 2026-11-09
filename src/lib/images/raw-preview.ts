/**
 * Finds what a RAW file already carries for display: every camera format
 * embeds at least one JPEG, so no sensor decoding is needed for previews.
 * Pure byte parsing, so it works the same for all brands and is unit tested.
 */

const SOI = Buffer.from([0xff, 0xd8, 0xff]);
const EOI = Buffer.from([0xff, 0xd9]);
/** Smaller embedded images are thumbnails, too poor to show in a gallery. */
const MIN_EDGE = 640;

export type EmbeddedJpeg = { start: number; end: number; width: number; height: number };

/**
 * Reads one JPEG's headers. Only baseline/extended/progressive frames count:
 * lossless JPEG (SOF3) is how CR2 and DNG store the sensor data itself, which
 * no image viewer can open. Walking segments also skips EXIF thumbnails.
 */
function parseJpegAt(buffer: Buffer, start: number): EmbeddedJpeg | null {
  let position = start + 2;
  let width = 0;
  let height = 0;
  while (position + 4 <= buffer.length) {
    if (buffer[position] !== 0xff) return null;
    const marker = buffer.readUInt8(position + 1);
    if (marker === 0xff) {
      position += 1; // fill byte
      continue;
    }
    const length = buffer.readUInt16BE(position + 2);
    if (length < 2) return null;

    if (marker === 0xda) {
      if (!width || !height) return null;
      const end = buffer.indexOf(EOI, position + 2 + length);
      return end === -1 ? null : { start, end: end + 2, width, height };
    }
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (position + 9 > buffer.length) return null;
      height = buffer.readUInt16BE(position + 5);
      width = buffer.readUInt16BE(position + 7);
    } else if (marker >= 0xc3 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return null; // lossless or arithmetic frame
    } else if (marker < 0xc0 || (marker >= 0xd0 && marker <= 0xd9)) {
      return null; // not a segment that can appear here: random bytes, not a JPEG
    }
    position += 2 + length;
  }
  return null;
}

/** The largest displayable JPEG in the file. Random FF D8 FF runs in sensor data fail the header walk. */
export function findLargestEmbeddedJpeg(raw: Buffer): EmbeddedJpeg | null {
  let best: EmbeddedJpeg | null = null;
  let from = 0;
  for (;;) {
    const start = raw.indexOf(SOI, from);
    if (start === -1) return best;
    const jpeg = parseJpegAt(raw, start);
    if (!jpeg) {
      from = start + 1;
      continue;
    }
    if (Math.min(jpeg.width, jpeg.height) >= MIN_EDGE && (!best || jpeg.width * jpeg.height > best.width * best.height)) best = jpeg;
    from = jpeg.end;
  }
}

function tiffOrientation(buffer: Buffer, base: number): number | null {
  if (base + 8 > buffer.length) return null;
  const order = buffer.toString("latin1", base, base + 2);
  if (order !== "II" && order !== "MM") return null;
  const little = order === "II";
  const u16 = (at: number) => (little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at));
  const u32 = (at: number) => (little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at));

  const directory = base + u32(base + 4);
  if (directory + 2 > buffer.length) return null;
  const entries = u16(directory);
  for (let i = 0; i < entries; i++) {
    const entry = directory + 2 + i * 12;
    if (entry + 12 > buffer.length) return null;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

/**
 * The camera's rotation flag. It lives in the RAW container, not in the
 * embedded JPEG, so without it vertical photos would show lying down.
 * RAF has no such directory: its JPEG carries its own EXIF.
 */
export function readRawOrientation(raw: Buffer): number | null {
  if (raw.length < 16) return null;
  if (raw.toString("latin1", 4, 8) === "ftyp") {
    const box = raw.subarray(0, 1024 * 1024).indexOf("CMT1", 0, "latin1"); // CR3 keeps a TIFF inside this box
    return box === -1 ? null : tiffOrientation(raw, box + 4);
  }
  return tiffOrientation(raw, 0);
}
