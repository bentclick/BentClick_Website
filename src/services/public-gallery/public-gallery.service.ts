import "server-only";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { CLIENT_SESSION_DAYS, readGalleryToken, writeGalleryToken } from "@/lib/security/gallery-cookie";
import { verifyGalleryPassword } from "@/lib/security/password";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { generateSessionToken, hmac, sha256 } from "@/lib/security/tokens";
import { DomainError, NotFoundError } from "@/services/errors";
import type { PhotoPage, PublicGalleryView } from "@/types/public-gallery";
import { type AccessDecision, decideAccess } from "./access-rules";
import {
  createClientSession,
  findClientSession,
  findCollectionBySlug,
  listReadyPhotos,
  listVisibleGalleries,
  markCollectionExpired,
  type PublicCollectionRow,
} from "./public-gallery.repository";

export const PHOTO_PAGE_SIZE = 60;
const SLUG = /^[0-9A-Za-z]{12}$/;

export type ResolvedGallery = {
  collection: PublicCollectionRow;
  decision: AccessDecision;
  session: Awaited<ReturnType<typeof findClientSession>>;
};

/** Loads the collection, the visitor's session and owner-preview rights, then applies the access rules. */
export async function resolveGallery(slug: string, opts: { preview?: boolean } = {}): Promise<ResolvedGallery | null> {
  if (!SLUG.test(slug)) return null;
  const collection = await findCollectionBySlug(prisma, slug);
  if (!collection) return null;

  const token = await readGalleryToken();
  const session = token ? await findClientSession(prisma, collection.id, sha256(token)) : null;
  const owner = opts.preview ? await getCurrentUser() : null;

  const decision = decideAccess({
    status: collection.status,
    linkEnabled: collection.linkEnabled,
    expiresAt: collection.expiresAt,
    hasPassword: collection.passwordHash !== null,
    accessVersion: collection.accessVersion,
    ownerPreview: owner?.id === collection.userId,
    session,
  });

  if (decision.kind === "EXPIRED" && decision.flipStatus) {
    // Persist lazily; the hourly sweep does the same for galleries nobody opens.
    await markCollectionExpired(prisma, collection.id).catch(() => undefined);
  }
  return { collection, decision, session };
}

export async function photoPage(collectionId: string, galleryId: string, cursor?: string): Promise<PhotoPage> {
  const rows = await listReadyPhotos(prisma, collectionId, galleryId, PHOTO_PAGE_SIZE, cursor);
  const page = rows.slice(0, PHOTO_PAGE_SIZE);
  const photos = await Promise.all(
    page.map(async (p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width ?? 3,
      height: p.height ?? 2,
      color: p.dominantColor,
      thumbUrl: (await signDisplayUrl(p.thumbnailKey)) ?? "",
      previewUrl: (await signDisplayUrl(p.previewKey)) ?? "",
    })),
  );
  return { photos, nextCursor: rows.length > PHOTO_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null };
}

export async function buildGalleryView(resolved: ResolvedGallery): Promise<PublicGalleryView> {
  const { collection, decision } = resolved;
  const galleries = await listVisibleGalleries(prisma, collection.id);
  const first = galleries[0];
  const profile = collection.user.profile;
  const cover = collection.coverPhoto?.status === "READY" ? collection.coverPhoto : null;

  return {
    slug: collection.slug,
    title: collection.title,
    eventDate: collection.eventDate?.toISOString() ?? null,
    layout: collection.layout,
    preview: decision.kind === "GRANTED" && decision.preview,
    coverUrl: await signDisplayUrl(cover?.previewKey),
    coverColor: cover?.dominantColor ?? null,
    studio: { name: profile?.brandName ?? collection.user.name, accent: profile?.accentColor ?? "#A27B5C" },
    features: {
      favorites: collection.allowFavorites,
      download: collection.allowIndividualDownload,
      fullDownload: collection.allowFullDownload,
      share: collection.allowSharing,
      requireIdentity: collection.requireClientIdentity,
    },
    galleries: galleries.map((g) => ({ id: g.id, name: g.name, count: g._count.photos })),
    firstPage: first ? await photoPage(collection.id, first.id) : { photos: [], nextCursor: null },
  };
}

async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return { ipHash: hmac(ip, process.env.GALLERY_TOKEN_SECRET ?? "dev"), userAgent: h.get("user-agent")?.slice(0, 300) ?? undefined };
}

/**
 * Starts a client session (or upgrades it after a password) and sets the
 * path-scoped cookie. Server Actions / Route Handlers only.
 */
export async function openClientSession(collection: PublicCollectionRow, passwordOk: boolean) {
  const token = generateSessionToken();
  const meta = await requestMeta();
  const session = await createClientSession(prisma, {
    collectionId: collection.id,
    tokenHash: sha256(token),
    accessVersion: collection.accessVersion,
    passwordOk,
    expiresAt: new Date(Date.now() + CLIENT_SESSION_DAYS * 86_400_000),
    ...meta,
  });
  await writeGalleryToken(collection.slug, token);
  return session;
}

/** 5 attempts per 15 minutes per visitor and gallery. */
export async function unlockWithPassword(slug: string, password: string) {
  const resolved = await resolveGallery(slug);
  if (!resolved || resolved.decision.kind === "NOT_FOUND") throw new NotFoundError("Gallery");
  const { collection } = resolved;
  if (!collection.passwordHash) return;

  const { ipHash } = await requestMeta();
  if (!(await consumeRateLimit(`gallery-pw:${collection.id}:${ipHash}`, 5, 15 * 60))) {
    throw new DomainError("RATE_LIMITED", "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }
  if (!(await verifyGalleryPassword(collection.passwordHash, password))) {
    throw new DomainError("WRONG_PASSWORD", "Senha incorreta.");
  }
  await openClientSession(collection, true);
}
