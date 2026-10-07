import "server-only";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/services/errors";
import { findOwnedCollection } from "@/services/collections/collection.repository";
import { clearSessionFavorites, findOwnedClientSession, reopenSessionSelection, listCollectionSelections, listSessionFavoritePhotos } from "./favorite.repository";
import { sessionFavoritePhotos } from "./favorites.service";

export type SelectionSummary = {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  count: number;
  submittedAt: string | null;
  lastSeenAt: string;
};

export async function listSelections(userId: string, collectionId: string): Promise<SelectionSummary[]> {
  const collection = await findOwnedCollection(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  const rows = await listCollectionSelections(prisma, collection.id);
  return rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    count: r._count.favorites,
    submittedAt: r.selectionSubmittedAt?.toISOString() ?? null,
    lastSeenAt: r.lastSeenAt.toISOString(),
  }));
}

export async function getSelection(userId: string, clientSessionId: string) {
  const session = await findOwnedClientSession(prisma, userId, clientSessionId);
  if (!session) throw new NotFoundError("Selection");
  return { session, photos: await sessionFavoritePhotos(session.id) };
}

/** Plain list of original filenames — pasted straight into Lightroom's filter. */
export async function exportSelectionFilenames(userId: string, clientSessionId: string): Promise<{ filename: string; body: string }> {
  const session = await findOwnedClientSession(prisma, userId, clientSessionId);
  if (!session) throw new NotFoundError("Selection");
  const photos = await listSessionFavoritePhotos(prisma, session.id);
  const who = (session.clientName ?? "cliente").normalize("NFD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase();
  return { filename: `selecao-${who}.txt`, body: `${photos.map((p) => p.originalFilename).join("\n")}\n` };
}

export async function clearSelection(userId: string, clientSessionId: string) {
  const session = await findOwnedClientSession(prisma, userId, clientSessionId);
  if (!session) throw new NotFoundError("Selection");
  // An emptied selection is open again, so the client can choose anew.
  await prisma.$transaction([clearSessionFavorites(prisma, session.id), reopenSessionSelection(prisma, session.id)]);
  return { collectionId: session.collectionId };
}

export async function reopenSelection(userId: string, clientSessionId: string) {
  const session = await findOwnedClientSession(prisma, userId, clientSessionId);
  if (!session) throw new NotFoundError("Selection");
  await reopenSessionSelection(prisma, session.id);
  return { collectionId: session.collectionId };
}
