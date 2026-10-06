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
  preview: (userId: string, collectionId: string, photoId: string) =>
    `${collectionRoot(userId, collectionId)}/previews/${photoId}.webp`,
  thumbnail: (userId: string, collectionId: string, photoId: string) =>
    `${collectionRoot(userId, collectionId)}/thumbnails/${photoId}.webp`,
  archive: (userId: string, downloadJobId: string) => `${root(userId)}/archives/${downloadJobId}.zip`,
  brandAsset: (userId: string, name: string, extension: string) => `${root(userId)}/brand/${name}.${extension}`,
  collectionPrefix: collectionRoot,
};
