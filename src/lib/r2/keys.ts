/**
 * The only place R2 object keys are built. See docs/ARCHITECTURE.md §5.
 * Keys are partitioned by collection (not gallery) so moving a photo between
 * galleries never requires copying objects.
 */

const root = (userId: string) => `photographers/${userId}`;
const collectionRoot = (userId: string, collectionId: string) => `${root(userId)}/collections/${collectionId}`;

export const r2Keys = {
  original: (userId: string, collectionId: string, photoId: string, extension: string) =>
    `${collectionRoot(userId, collectionId)}/originals/${photoId}.${extension}`,
  /** Versioned by watermark stamp so a re-rendered preview gets a new URL (no stale browser cache). */
  preview: (userId: string, collectionId: string, photoId: string, stamp?: string | null) =>
    `${collectionRoot(userId, collectionId)}/previews/${photoId}${stamp ? `.${stamp.replace(/[^\w-]/g, "-")}` : ""}.webp`,
  thumbnail: (userId: string, collectionId: string, photoId: string, version?: string | null) =>
    `${collectionRoot(userId, collectionId)}/thumbnails/${photoId}${version ? `.${version}` : ""}.webp`,
  /** The token makes each edit a new object, so replacing one never overwrites what is being served. */
  edited: (userId: string, collectionId: string, photoId: string, token: string, extension: string) =>
    `${collectionRoot(userId, collectionId)}/edited/${photoId}.${token}.${extension}`,
  archive: (userId: string, downloadJobId: string) => `${root(userId)}/archives/${downloadJobId}.zip`,
  archivePart: (userId: string, downloadJobId: string, index: number) => `${root(userId)}/archives/${downloadJobId}/parte-${index + 1}.zip`,
  /**
   * Lazily rendered download copies (high-res / web), cached next to the original. `source` names the file they were
   * rendered from (the original, or one edit): a copy of an old edit written late can never be served for a new one.
   * Without it, the key of the copies made before that rule (still deleted with the photo).
   */
  downloadVariant: (userId: string, collectionId: string, photoId: string, variant: "high" | "web", source?: string) =>
    `${collectionRoot(userId, collectionId)}/downloads/${variant}/${photoId}${source ? `.${source}` : ""}.jpg`,
  brandAsset: (userId: string, name: string, extension: string) => `${root(userId)}/brand/${name}.${extension}`,
  watermarkImage: (userId: string, watermarkId: string, version: number, extension: string) => `${root(userId)}/brand/watermark-${watermarkId}-v${version}.${extension}`,
  portfolioOriginal: (userId: string, albumId: string, imageId: string, extension: string) =>
    `${root(userId)}/portfolio/${albumId}/originals/${imageId}.${extension}`,
  portfolioPreview: (userId: string, albumId: string, imageId: string) => `${root(userId)}/portfolio/${albumId}/previews/${imageId}.webp`,
  portfolioThumbnail: (userId: string, albumId: string, imageId: string) => `${root(userId)}/portfolio/${albumId}/thumbnails/${imageId}.webp`,
  collectionPrefix: collectionRoot,
};
