/**
 * Upload rules shared by the browser (pre-flight checks) and the server
 * (authoritative checks). The derivative step re-verifies real file content.
 */

export const MAX_FILES_PER_BATCH = 200;
export const MAX_IMAGE_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_RAW_BYTES = 150 * 1024 * 1024; // 150 MB

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** RAW formats are stored as originals only (no previews generated). */
const RAW_EXTENSIONS = ["cr2", "cr3", "nef", "arw", "dng", "raf", "orf", "rw2"] as const;

export type FileKind = "image" | "raw";

export type FileCheck =
  | { ok: true; kind: FileKind; extension: string; mimeType: string }
  | { ok: false; reason: string };

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/** Browsers report RAW files with empty or vendor MIME types, so RAW is detected by extension. */
export function checkFile(file: { name: string; type: string; size: number }): FileCheck {
  const ext = extensionOf(file.name);

  if ((RAW_EXTENSIONS as readonly string[]).includes(ext)) {
    if (file.size > MAX_RAW_BYTES) return { ok: false, reason: "Arquivo RAW acima de 150 MB" };
    return { ok: true, kind: "raw", extension: ext, mimeType: "application/octet-stream" };
  }

  const mimeExt = IMAGE_TYPES[file.type];
  if (!mimeExt) return { ok: false, reason: "Formato não suportado (use JPG, PNG, WebP ou RAW)" };
  if (file.size <= 0) return { ok: false, reason: "Arquivo vazio" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: "Arquivo acima de 200 MB" };
  return { ok: true, kind: "image", extension: mimeExt, mimeType: file.type };
}

/** Display-safe filename: strips paths and control characters, keeps the extension. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "foto";
  const clean = base
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || "foto").slice(0, 180);
}

export const ACCEPT_ATTRIBUTE = [
  ...Object.keys(IMAGE_TYPES),
  ...RAW_EXTENSIONS.map((e) => `.${e}`),
  ".jpg",
  ".jpeg",
].join(",");
