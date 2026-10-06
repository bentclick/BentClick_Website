import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_GALLERY_NAME } from "@/lib/constants/collection";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { hashGalleryPassword } from "@/lib/security/password";
import { generateGallerySlug } from "@/lib/security/tokens";
import type { CollectionFilters, CreateCollectionInput } from "@/lib/validation/collection";
import { logActivity } from "@/services/activity/activity.repository";
import { resolveClientId } from "@/services/clients/client.service";
import { DomainError, NotFoundError } from "@/services/errors";
import type { CollectionListItem } from "@/types/collection";
import {
  countCollectionsForUser,
  countSelections,
  countReadyPhotos,
  deleteCollectionRow,
  findOwnedCollection,
  findOwnedCollectionForEditor,
  findOwnedWatermarkId,
  insertCollection,
  listCollectionsForUser,
  slugExists,
  updateCollectionStatus,
} from "./collection.repository";
import { PUBLISH_ISSUE_MESSAGES, effectiveStatus, publishIssues, resolveExpiry } from "./collection-rules";

const SLUG_ATTEMPTS = 5;

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < SLUG_ATTEMPTS; i++) {
    const slug = generateGallerySlug();
    if (!(await slugExists(prisma, slug))) return slug;
  }
  throw new Error("Could not allocate a unique gallery slug");
}

async function requireOwned(userId: string, collectionId: string) {
  const collection = await findOwnedCollection(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  return collection;
}

// ─── Queries ──────────────────────────────────────────────────

export async function listCollections(userId: string, filters: CollectionFilters): Promise<CollectionListItem[]> {
  const now = new Date();
  const rows = await listCollectionsForUser(prisma, userId, filters, now);
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      clientName: row.client?.name ?? null,
      category: row.category,
      status: effectiveStatus(row.status, row.expiresAt, now),
      eventDate: row.eventDate?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      photoCount: row.photoCount,
      favoriteCount: row._count.favorites,
      coverUrl: await signDisplayUrl(row.coverPhoto?.previewKey ?? row.coverPhoto?.thumbnailKey),
      coverColor: row.coverPhoto?.dominantColor ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
}

export async function hasAnyCollections(userId: string): Promise<boolean> {
  return (await countCollectionsForUser(prisma, userId)) > 0;
}

/** Cached per request: the editor layout and its pages share one query. */
export const getCollectionForEditor = cache(async (userId: string, collectionId: string) => {
  const collection = await findOwnedCollectionForEditor(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  const { passwordHash, totalBytes, coverPhoto, ...rest } = collection;
  return {
    ...rest,
    hasPassword: passwordHash !== null,
    totalBytes: Number(totalBytes),
    status: effectiveStatus(collection.status, collection.expiresAt),
    coverUrl: await signDisplayUrl(coverPhoto?.previewKey ?? coverPhoto?.thumbnailKey),
    coverColor: coverPhoto?.dominantColor ?? null,
    selectionCount: await countSelections(prisma, collection.id),
  };
});

export type CollectionEditorData = Awaited<ReturnType<typeof getCollectionForEditor>>;

// ─── Commands ─────────────────────────────────────────────────

export async function createCollection(userId: string, input: CreateCollectionInput): Promise<{ id: string }> {
  const [slug, passwordHash] = await Promise.all([
    uniqueSlug(),
    input.requirePassword ? hashGalleryPassword(input.password.trim()) : Promise.resolve(null),
  ]);

  return prisma.$transaction(async (tx) => {
    const clientId = await resolveClientId(tx, userId, input.client);

    let watermarkId: string | null = null;
    if (input.watermarkId) {
      const watermark = await findOwnedWatermarkId(tx, userId, input.watermarkId);
      if (!watermark) throw new NotFoundError("Watermark");
      watermarkId = watermark.id;
    }

    return insertCollection(tx, {
      userId,
      clientId,
      title: input.title,
      slug,
      eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : null,
      category: input.category,
      expiresAt: resolveExpiry(input.expiryPreset, input.customExpiry),
      isPrivate: input.isPrivate,
      passwordHash,
      allowFavorites: input.allowFavorites,
      allowIndividualDownload: input.allowIndividualDownload,
      allowFullDownload: input.allowFullDownload,
      allowSharing: input.allowSharing,
      downloadQuality: input.downloadQuality,
      watermarkId,
      galleries: { create: { name: DEFAULT_GALLERY_NAME, sortOrder: 0 } },
    });
  });
}

export async function publishCollection(userId: string, collectionId: string) {
  const collection = await requireOwned(userId, collectionId);
  const issues = publishIssues({
    status: collection.status,
    readyPhotoCount: await countReadyPhotos(prisma, collection.id),
    coverPhotoId: collection.coverPhotoId,
    expiresAt: collection.expiresAt,
  });
  if (issues.length > 0) throw new DomainError(issues[0]!, PUBLISH_ISSUE_MESSAGES[issues[0]!]);

  await prisma.$transaction(async (tx) => {
    await updateCollectionStatus(tx, collection.id, { status: "PUBLISHED", publishedAt: new Date() });
    await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "COLLECTION_PUBLISHED" });
  });
}

export async function unpublishCollection(userId: string, collectionId: string) {
  const collection = await requireOwned(userId, collectionId);
  if (collection.status !== "PUBLISHED" && collection.status !== "EXPIRED") return;
  await prisma.$transaction(async (tx) => {
    await updateCollectionStatus(tx, collection.id, { status: "DRAFT" });
    await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "COLLECTION_UNPUBLISHED" });
  });
}

export async function archiveCollection(userId: string, collectionId: string) {
  const collection = await requireOwned(userId, collectionId);
  await prisma.$transaction(async (tx) => {
    await updateCollectionStatus(tx, collection.id, { status: "ARCHIVED", archivedAt: new Date() });
    await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "COLLECTION_ARCHIVED" });
  });
}

export async function restoreCollection(userId: string, collectionId: string) {
  const collection = await requireOwned(userId, collectionId);
  if (collection.status !== "ARCHIVED") return;
  await updateCollectionStatus(prisma, collection.id, { status: "DRAFT", archivedAt: null });
}

/** Copies settings and gallery structure (not photos) into a new draft. */
export async function duplicateCollection(userId: string, collectionId: string): Promise<{ id: string }> {
  const source = await findOwnedCollectionForEditor(prisma, userId, collectionId);
  if (!source) throw new NotFoundError("Collection");
  const slug = await uniqueSlug();

  return insertCollection(prisma, {
    userId,
    clientId: source.clientId,
    title: `${source.title} (cópia)`.slice(0, 120),
    description: source.description,
    slug,
    eventDate: source.eventDate,
    category: source.category,
    expiresAt: source.expiresAt,
    isPrivate: source.isPrivate,
    passwordHash: source.passwordHash,
    allowFavorites: source.allowFavorites,
    allowIndividualDownload: source.allowIndividualDownload,
    allowFullDownload: source.allowFullDownload,
    allowSharing: source.allowSharing,
    requireClientIdentity: source.requireClientIdentity,
    downloadQuality: source.downloadQuality,
    layout: source.layout,
    watermarkId: source.watermarkId,
    galleries: { create: source.galleries.map((g, index) => ({ name: g.name, sortOrder: index })) },
  });
}

/**
 * Permanent deletion. Collections holding files must have their R2 objects
 * purged first — that runs in the media worker (Phase 4), so until then only
 * empty collections can be deleted here.
 */
export async function deleteCollection(userId: string, collectionId: string) {
  const collection = await requireOwned(userId, collectionId);
  if (collection.photoCount > 0) {
    throw new DomainError("PURGE_REQUIRED", "Coleções com fotos são removidas pela rotina de limpeza do armazenamento — arquive por enquanto.");
  }
  await deleteCollectionRow(prisma, collection.id);
}
