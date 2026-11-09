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
