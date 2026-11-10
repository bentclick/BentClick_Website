/**
 * The postMessage contract of LightCraft's `?host=parent` mode (its docs/web.md).
 * Anything that doesn't match is ignored: the frame's data is never trusted by shape.
 */

export type EditorMessage =
  | { type: "ready" }
  | { type: "failed"; error: string }
  | { type: "dirty"; dirty: boolean }
  | { type: "save"; name: string; bytes: ArrayBuffer }
  | { type: "response"; ok: boolean; value: string };

export function parseEditorMessage(data: unknown): EditorMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  switch (m.type) {
    case "lightcraft:ready":
      return { type: "ready" };
    case "lightcraft:failed":
      return { type: "failed", error: typeof m.error === "string" ? m.error : "" };
    case "lightcraft:dirty":
      return typeof m.dirty === "boolean" ? { type: "dirty", dirty: m.dirty } : null;
    case "lightcraft:save":
      return typeof m.name === "string" && m.bytes instanceof ArrayBuffer ? { type: "save", name: m.name, bytes: m.bytes } : null;
    case "lightcraft:response":
      return typeof m.ok === "boolean" ? { type: "response", ok: m.ok, value: typeof m.value === "string" ? m.value : "" } : null;
    default:
      return null;
  }
}

const EXPORT_TYPES: Record<string, { type: string; extension: string }> = {
  jpg: { type: "image/jpeg", extension: "jpg" },
  jpeg: { type: "image/jpeg", extension: "jpg" },
  png: { type: "image/png", extension: "png" },
  webp: { type: "image/webp", extension: "webp" },
};

/**
 * "Aplicar à foto": a full-size JPEG of the photo on screen, which the frame hands back as `lightcraft:save`. The
 * Export dialog can't do this alone on the web: there is no default folder there, so with its Folder field blank it
 * refuses ("Choose an export folder first."), and the field starts blank in every session since the library is wiped.
 * The folder is only a label here; nothing is written to disk.
 */
export const APPLY_EDIT_COMMAND = {
  type: "lightcraft:cmd",
  id: "app.export",
  params: JSON.stringify({ dir: "bentclick", format: "jpeg", quality: 92 }),
} as const;

const baseName = (filename: string) => filename.replace(/\.[^.]+$/, "").toLowerCase();

/**
 * Whether an export came from the photo being edited. The editor's library also holds its demo photos, and exports
 * are named after their source (`{name}`, plus a number when one is taken), so another source means another photo.
 */
export function isExportOf(originalFilename: string, savedName: string): boolean {
  return baseName(savedName).startsWith(baseName(originalFilename));
}

/** An export the site can deliver, named after the photo. Library backups and TIFF return null. */
export function exportedFileSpec(originalFilename: string, savedName: string): { name: string; type: string } | null {
  const format = EXPORT_TYPES[savedName.split(".").pop()?.toLowerCase() ?? ""];
  if (!format) return null;
  return { name: `${originalFilename.replace(/\.[^.]+$/, "")}.${format.extension}`, type: format.type };
}
