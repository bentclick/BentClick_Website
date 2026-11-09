import { describe, expect, it } from "vitest";
import { findLargestEmbeddedJpeg, readRawOrientation } from "./raw-preview";

function jpeg(width: number, height: number, sof = 0xc0): Buffer {
  const dims = Buffer.alloc(4);
  dims.writeUInt16BE(height, 0);
  dims.writeUInt16BE(width, 2);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]), // SOI + APP0
    Buffer.from([0xff, sof, 0x00, 0x0b, 0x08]),
    dims,
    Buffer.from([0x01, 0x01, 0x11, 0x00]),
    Buffer.from([0xff, 0xda, 0x00, 0x02, 0x12, 0x34, 0x56]), // SOS + data
    Buffer.from([0xff, 0xd9]),
  ]);
}

function tiffWithOrientation(value: number, order: "II" | "MM" = "II"): Buffer {
  const b = Buffer.alloc(26);
  const little = order === "II";
  b.write(order, 0, "latin1");
  if (little) {
    b.writeUInt32LE(8, 4);
    b.writeUInt16LE(1, 8);
    b.writeUInt16LE(0x0112, 10);
    b.writeUInt16LE(value, 18);
  } else {
    b.writeUInt32BE(8, 4);
    b.writeUInt16BE(1, 8);
    b.writeUInt16BE(0x0112, 10);
    b.writeUInt16BE(value, 18);
  }
  return b;
}

describe("findLargestEmbeddedJpeg", () => {
  it("picks the largest image and returns its exact bounds", () => {
    const small = jpeg(800, 700);
    const large = jpeg(4000, 3000);
    const raw = Buffer.concat([Buffer.alloc(32), small, Buffer.alloc(9), large, Buffer.alloc(5)]);
    expect(findLargestEmbeddedJpeg(raw)).toEqual({ start: 32 + small.length + 9, end: 32 + small.length + 9 + large.length, width: 4000, height: 3000 });
  });

  it("ignores lossless sensor data, thumbnails and random marker bytes", () => {
    const raw = Buffer.concat([jpeg(6000, 4000, 0xc3), jpeg(160, 120), Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22]), jpeg(1616, 1080)]);
    expect(findLargestEmbeddedJpeg(raw)).toMatchObject({ width: 1616, height: 1080 });
  });

  it("returns null when nothing is displayable or the image is cut off", () => {
    expect(findLargestEmbeddedJpeg(Buffer.alloc(4096))).toBeNull();
    const truncated = jpeg(4000, 3000).subarray(0, -2);
    expect(findLargestEmbeddedJpeg(truncated)).toBeNull();
  });
});

describe("readRawOrientation", () => {
  it("reads both TIFF byte orders", () => {
    expect(readRawOrientation(tiffWithOrientation(6))).toBe(6);
    expect(readRawOrientation(tiffWithOrientation(8, "MM"))).toBe(8);
  });

  it("reads the TIFF inside a CR3 CMT1 box", () => {
    const head = Buffer.alloc(32);
    head.write("ftyp", 4, "latin1");
    expect(readRawOrientation(Buffer.concat([head, Buffer.from("CMT1", "latin1"), tiffWithOrientation(3)]))).toBe(3);
  });

  it("returns null for other containers and invalid values", () => {
    expect(readRawOrientation(Buffer.from("FUJIFILMCCD-RAW 0201FF129502"))).toBeNull();
    expect(readRawOrientation(tiffWithOrientation(99))).toBeNull();
  });
});
