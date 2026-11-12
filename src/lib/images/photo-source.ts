/**
 * Which stored file a photo is shown and delivered from. An edited version
 * replaces the original for clients only; the photographer keeps the RAW.
 * Pure on purpose: every display and download path shares these rules.
 */

type EditedFields = { editedKey: string | null; editedMimeType: string | null };

/** The file previews and thumbnails are rendered from. */
export function displaySource(photo: EditedFields & { storageKey: string; mimeType: string }): { key: string; mimeType: string } {
  return photo.editedKey && photo.editedMimeType ? { key: photo.editedKey, mimeType: photo.editedMimeType } : { key: photo.storageKey, mimeType: photo.mimeType };
}

/** ".../edited/<photoId>.<token>.<ext>" → "<token>": unique per edit. */
export function editToken(editedKey: string): string {
  return editedKey.split("/").pop()?.split(".")[1] ?? "";
}

/** Each edit gets its own preview object, so a browser can never show a cached older one. */
export function previewVersion(editedKey: string | null, stamp: string | null): string | null {
  return [editedKey ? editToken(editedKey) : null, stamp].filter(Boolean).join("-") || null;
}

type Deliverable = EditedFields & {
  storageKey: string;
  mimeType: string;
  originalFilename: string;
  fileSize: bigint;
  editedFilename: string | null;
  editedFileSize: bigint | null;
};

/** The photo as a client receives it: the edited file when there is one. */
export function clientDeliverable<T extends Deliverable>(photo: T): T {
  if (!photo.editedKey || !photo.editedMimeType || !photo.editedFilename || photo.editedFileSize === null) return photo;
  return { ...photo, storageKey: photo.editedKey, mimeType: photo.editedMimeType, originalFilename: photo.editedFilename, fileSize: photo.editedFileSize };
}

/** The name a client sees: the edited file's ("DSC0001.jpg") once there is one, never the RAW's. */
export function clientFilename(photo: { filename: string; editedFilename: string | null }): string {
  return photo.editedFilename ?? photo.filename;
}

/** The collection's watermark look, as stamped on each preview rendered with it; null without a watermark. */
export function watermarkStamp(watermark: { id: string; version: number } | null | undefined): string | null {
  return watermark ? `${watermark.id}:${watermark.version}` : null;
}

/**
 * The large image a visitor may see. A preview rendered before the current watermark (it was just set or changed and
 * the re-render hasn't reached this photo yet) is a clean 2048 px copy: until then the visitor gets the thumbnail.
 * Without a watermark any preview is fine.
 */
export function visiblePreviewKey(photo: { previewKey: string | null; previewStamp: string | null; thumbnailKey: string | null }, stamp: string | null): string | null {
  if (stamp && photo.previewStamp !== stamp) return photo.thumbnailKey;
  return photo.previewKey;
}
