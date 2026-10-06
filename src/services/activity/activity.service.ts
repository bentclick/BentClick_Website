import "server-only";
import type { ActivityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/services/errors";
import { findOwnedCollection } from "@/services/collections/collection.repository";

export type CollectionStats = {
  views: number;
  visitors: number;
  favorites: number;
  selections: number;
  downloads: number;
  lastAccessedAt: string | null;
};

export type ActivityItem = {
  id: string;
  type: ActivityType;
  actor: "PHOTOGRAPHER" | "CLIENT" | "SYSTEM";
  who: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

async function ownedId(userId: string, collectionId: string) {
  const collection = await findOwnedCollection(prisma, userId, collectionId);
  if (!collection) throw new NotFoundError("Collection");
  return collection;
}

export async function getCollectionStats(userId: string, collectionId: string): Promise<CollectionStats> {
  const collection = await ownedId(userId, collectionId);
  const [views, visitors, favorites, selections, downloads] = await Promise.all([
    prisma.activityLog.count({ where: { collectionId: collection.id, type: "GALLERY_VIEWED" } }),
    prisma.clientSession.count({ where: { collectionId: collection.id } }),
    prisma.favorite.count({ where: { collectionId: collection.id } }),
    prisma.clientSession.count({ where: { collectionId: collection.id, selectionSubmittedAt: { not: null } } }),
    prisma.download.count({ where: { collectionId: collection.id } }),
  ]);
  return { views, visitors, favorites, selections, downloads, lastAccessedAt: collection.lastAccessedAt?.toISOString() ?? null };
}

export async function listCollectionActivity(userId: string, collectionId: string, take = 100): Promise<ActivityItem[]> {
  const collection = await ownedId(userId, collectionId);
  const rows = await prisma.activityLog.findMany({
    where: { collectionId: collection.id },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, actorType: true, metadata: true, createdAt: true, clientSession: { select: { clientName: true, clientEmail: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    actor: r.actorType,
    who: r.clientSession?.clientName ?? r.clientSession?.clientEmail ?? null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type DownloadRow = {
  id: string;
  collectionId: string;
  collectionTitle: string;
  kind: string;
  quality: string;
  filename: string | null;
  who: string | null;
  bytes: number | null;
  createdAt: string;
};

/** Every download across the photographer's collections, newest first. */
export async function listDownloads(userId: string, opts: { collectionId?: string; take?: number } = {}): Promise<DownloadRow[]> {
  const rows = await prisma.download.findMany({
    where: { collection: { userId }, ...(opts.collectionId ? { collectionId: opts.collectionId } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 200,
    select: {
      id: true,
      collectionId: true,
      kind: true,
      quality: true,
      bytes: true,
      createdAt: true,
      collection: { select: { title: true } },
      photo: { select: { originalFilename: true } },
      clientSession: { select: { clientName: true, clientEmail: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    collectionId: r.collectionId,
    collectionTitle: r.collection.title,
    kind: r.kind,
    quality: r.quality,
    filename: r.photo?.originalFilename ?? null,
    who: r.clientSession?.clientName ?? r.clientSession?.clientEmail ?? null,
    bytes: r.bytes === null ? null : Number(r.bytes),
    createdAt: r.createdAt.toISOString(),
  }));
}
