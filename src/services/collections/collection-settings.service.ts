import "server-only";
import { prisma } from "@/lib/db/prisma";
import { hashGalleryPassword } from "@/lib/security/password";
import type { AccessInput, DetailsInput, ExpiryInput, PermissionsInput } from "@/lib/validation/collection-settings";
import { logActivity } from "@/services/activity/activity.repository";
import { findOwnedClient } from "@/services/clients/client.repository";
import { NotFoundError } from "@/services/errors";
import { findOwnedCollection, slugExists } from "./collection.repository";
import { resolveExpiry } from "./collection-rules";
import { generateGallerySlug } from "@/lib/security/tokens";

async function owned(userId: string, collectionId: string) {
  const collection = await findOwnedCollection(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  return collection;
}

export async function updateDetails(userId: string, input: DetailsInput) {
  const collection = await owned(userId, input.collectionId);
  let clientId: string | null = null;
  if (input.clientId) {
    const client = await findOwnedClient(prisma, userId, input.clientId);
    if (!client) throw new NotFoundError("Client");
    clientId = client.id;
  }
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      title: input.title,
      description: input.description || null,
      eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : null,
      category: input.category,
      clientId,
    },
  });
}

/**
 * Changing the date of an expired gallery to the future (or "never") reactivates it;
 * originals were never deleted, so the client simply regains access.
 */
export async function updateExpiry(userId: string, input: ExpiryInput) {
  const collection = await owned(userId, input.collectionId);
  if (input.preset === "keep") return;
  const expiresAt = resolveExpiry(input.preset, input.customDate);
  const reactivate = collection.status === "EXPIRED" && (expiresAt === null || expiresAt.getTime() > Date.now());

  await prisma.$transaction(async (tx) => {
    await tx.collection.update({ where: { id: collection.id }, data: { expiresAt, ...(reactivate ? { status: "PUBLISHED" } : {}) } });
    await logActivity(tx, {
      userId,
      collectionId: collection.id,
      actorType: "PHOTOGRAPHER",
      type: "EXPIRATION_CHANGED",
      metadata: { from: collection.expiresAt?.toISOString() ?? null, to: expiresAt?.toISOString() ?? null, reactivated: reactivate },
    });
  });
}

export async function updateAccess(userId: string, input: AccessInput) {
  const collection = await owned(userId, input.collectionId);
  await prisma.collection.update({
    where: { id: collection.id },
    data: { isPrivate: input.isPrivate, requireClientIdentity: input.requireClientIdentity },
  });
}

/**
 * New or removed password: every visitor must (re-)enter it, but their
 * sessions — and favourites — are kept.
 */
export async function setPassword(userId: string, collectionId: string, password: string | null) {
  const collection = await owned(userId, collectionId);
  const passwordHash = password ? await hashGalleryPassword(password) : null;
  await prisma.$transaction(async (tx) => {
    await tx.collection.update({ where: { id: collection.id }, data: { passwordHash } });
    await tx.clientSession.updateMany({ where: { collectionId: collection.id }, data: { passwordOk: false } });
    await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "PASSWORD_CHANGED", metadata: { enabled: Boolean(password) } });
  });
}

export async function updatePermissions(userId: string, input: PermissionsInput) {
  const collection = await owned(userId, input.collectionId);
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      allowFavorites: input.allowFavorites,
      allowIndividualDownload: input.allowIndividualDownload,
      allowFullDownload: input.allowFullDownload,
      allowSharing: input.allowSharing,
      downloadQuality: input.downloadQuality,
      layout: input.layout,
    },
  });
}

/** New random link; the old one stops working and every client session is revoked. */
export async function regenerateLink(userId: string, collectionId: string): Promise<{ slug: string }> {
  const collection = await owned(userId, collectionId);
  let slug = generateGallerySlug();
  for (let i = 0; i < 4 && (await slugExists(prisma, slug)); i++) slug = generateGallerySlug();
  await prisma.$transaction(async (tx) => {
    await tx.collection.update({ where: { id: collection.id }, data: { slug, accessVersion: { increment: 1 } } });
    await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "LINK_REGENERATED" });
  });
  return { slug };
}

export async function setLinkEnabled(userId: string, collectionId: string, enabled: boolean) {
  const collection = await owned(userId, collectionId);
  await prisma.$transaction(async (tx) => {
    await tx.collection.update({ where: { id: collection.id }, data: { linkEnabled: enabled } });
    if (!enabled) await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "LINK_DISABLED" });
  });
}
