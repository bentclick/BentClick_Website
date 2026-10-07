import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { clientIpHash } from "@/lib/security/client-ip";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/services/activity/activity.repository";
import { notifySelectionSubmitted } from "@/services/email/email.service";
import { DomainError, NotFoundError } from "@/services/errors";
import { assertVisitorIdentified, openClientSession, type ResolvedGallery, resolveGallery, validSession } from "@/services/public-gallery/public-gallery.service";
import type { PublicPhoto } from "@/types/public-gallery";
import {
  countSessionFavorites,
  findReadyPhotoInCollection,
  listSessionFavoriteIds,
  listSessionFavoritePhotos,
  toggleFavoriteRow,
  submitSessionSelection,
} from "./favorite.repository";

async function requireFavoritesAccess(slug: string) {
  const resolved = await resolveGallery(slug);
  if (!resolved || resolved.decision.kind !== "GRANTED") throw new NotFoundError("Gallery");
  if (!resolved.collection.allowFavorites) throw new DomainError("FAVORITES_DISABLED", "Os favoritos estão desativados nesta galeria.");
  return resolved;
}

/** The visitor's current session id, when it is still valid for this gallery. */
function validSessionId(resolved: ResolvedGallery): string | null {
  return validSession(resolved)?.id ?? null;
}

const SELECTION_CLOSED = "Sua seleção já foi enviada ao fotógrafo. Para mudar, peça a ele para reabri-la.";

/** Valid session id for this visitor, starting one on the first heart. */
async function sessionIdFor(resolved: ResolvedGallery): Promise<string> {
  return validSessionId(resolved) ?? (await openClientSession(resolved.collection, false)).id;
}

export async function toggleFavorite(slug: string, photoId: string) {
  const resolved = await requireFavoritesAccess(slug);
  const { collection } = resolved;
  if (!(await findReadyPhotoInCollection(prisma, collection.id, photoId))) throw new NotFoundError("Photo");
  assertVisitorIdentified(resolved);
  if (validSession(resolved)?.selectionSubmittedAt) throw new DomainError("SELECTION_CLOSED", SELECTION_CLOSED);

  // Per IP as well as per session: a visitor without a cookie gets a fresh session every time.
  await enforceRateLimit(`fav-ip:${collection.id}:${await clientIpHash()}`, 300, 60);
  const clientSessionId = await sessionIdFor(resolved);
  await enforceRateLimit(`fav:${clientSessionId}`, 240, 60);
  const favorited = await toggleFavoriteRow(prisma, { collectionId: collection.id, clientSessionId, photoId });
  await logActivity(prisma, {
    userId: collection.userId,
    collectionId: collection.id,
    clientSessionId,
    actorType: "CLIENT",
    type: favorited ? "PHOTO_FAVORITED" : "PHOTO_UNFAVORITED",
    metadata: { photoId },
  });
  return { favorited, count: await countSessionFavorites(prisma, clientSessionId) };
}

/** Favourite ids for the initial render; empty when the visitor has no session yet. */
export async function favoriteIdsFor(resolved: ResolvedGallery): Promise<string[]> {
  const sessionId = validSessionId(resolved);
  return sessionId ? listSessionFavoriteIds(prisma, sessionId) : [];
}

export async function sessionFavoritePhotos(clientSessionId: string): Promise<PublicPhoto[]> {
  const rows = await listSessionFavoritePhotos(prisma, clientSessionId);
  return Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width ?? 3,
      height: p.height ?? 2,
      color: p.dominantColor,
      thumbUrl: (await signDisplayUrl(p.thumbnailKey)) ?? "",
      previewUrl: (await signDisplayUrl(p.previewKey)) ?? "",
    })),
  );
}

export async function listMyFavorites(slug: string): Promise<PublicPhoto[]> {
  const resolved = await requireFavoritesAccess(slug);
  const sessionId = validSessionId(resolved);
  return sessionId ? sessionFavoritePhotos(sessionId) : [];
}

/** The client hands the selection to the photographer with a name and email. */
export async function submitSelection(slug: string, identity: { clientName: string; clientEmail: string }) {
  const resolved = await requireFavoritesAccess(slug);
  const sessionId = validSessionId(resolved);
  const count = sessionId ? await countSessionFavorites(prisma, sessionId) : 0;
  if (!sessionId || count === 0) throw new DomainError("NO_SELECTION", "Marque fotos com o coração antes de enviar.");
  // Each submission e-mails the photographer.
  await enforceRateLimit(`selection:${await clientIpHash()}`, 5, 3600);
  if (!(await submitSessionSelection(prisma, sessionId, identity))) throw new DomainError("SELECTION_CLOSED", SELECTION_CLOSED);
  await logActivity(prisma, {
    userId: resolved.collection.userId,
    collectionId: resolved.collection.id,
    clientSessionId: sessionId,
    actorType: "CLIENT",
    type: "SELECTION_SUBMITTED",
    metadata: { count, clientName: identity.clientName },
  });
  after(() => notifySelectionSubmitted(resolved.collection.id, identity.clientName, identity.clientEmail, count));
  return { count };
}
