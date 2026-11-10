import "server-only";
import { prisma } from "@/lib/db/prisma";
import { signDownloadUrl } from "@/lib/r2/signed-urls";
import { NotFoundError } from "@/services/errors";
import { findEditablePhoto } from "./photo-edit.repository";

export type DevelopSession = { photoId: string; collectionId: string; filename: string; sourceUrl: string };

/** What the editor screen needs: the owner's RAW, through a short-lived link. */
export async function getDevelopSession(userId: string, photoId: string): Promise<DevelopSession> {
  const photo = await findEditablePhoto(prisma, userId, photoId);
  if (!photo || photo.status !== "READY") throw new NotFoundError("Photo");
  return { photoId: photo.id, collectionId: photo.collectionId, filename: photo.originalFilename, sourceUrl: await signDownloadUrl(photo.storageKey, photo.originalFilename) };
}
