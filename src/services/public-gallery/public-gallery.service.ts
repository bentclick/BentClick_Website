import "server-only";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { CLIENT_SESSION_DAYS, readGalleryToken, writeGalleryToken } from "@/lib/security/gallery-cookie";
import { verifyGalleryPassword } from "@/lib/security/password";
import { clientIpHash } from "@/lib/security/client-ip";
import { consumeRateLimit, enforceRateLimit, isRateLimited } from "@/lib/security/rate-limit";
import { generateSessionToken, sha256 } from "@/lib/security/tokens";
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
  setSessionIdentity,
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

/** The visitor's session when it is valid for this gallery (never in owner preview). */
export function validSession(resolved: ResolvedGallery) {
  return resolved.decision.kind === "GRANTED" && resolved.decision.sessionValid && !resolved.decision.preview ? resolved.session : null;
}

/** Galleries set to ask for name and e-mail refuse hearts and downloads until the visitor gave them. */
export function assertVisitorIdentified(resolved: ResolvedGallery) {
  if (!resolved.collection.requireClientIdentity) return;
  if (resolved.decision.kind === "GRANTED" && resolved.decision.preview) return;
  if (!validSession(resolved)?.clientEmail) throw new DomainError("IDENTITY_REQUIRED", "Informe seu nome e e-mail para continuar.");
}

export async function identifyVisitor(slug: string, identity: { clientName: string; clientEmail: string }) {
  const resolved = await resolveGallery(slug);
  if (!resolved || resolved.decision.kind !== "GRANTED" || resolved.decision.preview) throw new NotFoundError("Gallery");
  const sessionId = validSession(resolved)?.id ?? (await openClientSession(resolved.collection, false)).id;
  await setSessionIdentity(prisma, sessionId, identity);
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
    visitor: (() => {
      const session = validSession(resolved);
      return { name: session?.clientName ?? null, email: session?.clientEmail ?? null, selectionClosed: Boolean(session?.selectionSubmittedAt) };
    })(),
    galleries: galleries.map((g) => ({ id: g.id, name: g.name, count: g._count.photos })),
    firstPage: first ? await photoPage(collection.id, first.id) : { photos: [], nextCursor: null },
  };
}

async function requestMeta() {
  const h = await headers();
  return { ipHash: await clientIpHash(), userAgent: h.get("user-agent")?.slice(0, 300) ?? undefined };
}

/** New visitor sessions per IP (all galleries) and per gallery: clearing the cookie must not reset the other limits. */
const SESSIONS_PER_IP_PER_HOUR = 30;
const SESSIONS_PER_GALLERY_PER_HOUR = 500;

/**
 * Starts a client session (or upgrades it after a password) and sets the
 * path-scoped cookie. Server Actions / Route Handlers only.
 */
export async function openClientSession(collection: PublicCollectionRow, passwordOk: boolean) {
  const meta = await requestMeta();
  await enforceRateLimit(`gallery-session:ip:${meta.ipHash}`, SESSIONS_PER_IP_PER_HOUR, 3600);
  await enforceRateLimit(`gallery-session:${collection.id}`, SESSIONS_PER_GALLERY_PER_HOUR, 3600);
  const token = generateSessionToken();
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

/** Guesses per visitor IP, and wrong guesses per gallery from everyone (an attacker can rotate IPs, not galleries). */
const PASSWORD_TRIES_PER_IP = 5;
const PASSWORD_IP_WINDOW = 15 * 60;
const WRONG_PASSWORDS_PER_GALLERY = 20;
const GALLERY_LOCK_WINDOW = 60 * 60;

export async function unlockWithPassword(slug: string, password: string) {
  const resolved = await resolveGallery(slug);
  // Expired galleries answer like unknown ones: no password oracle once access has ended.
  if (!resolved || (resolved.decision.kind !== "NEEDS_PASSWORD" && resolved.decision.kind !== "GRANTED")) throw new NotFoundError("Gallery");
  const { collection } = resolved;
  if (!collection.passwordHash) return;

  const { ipHash } = await requestMeta();
  const lockKey = `gallery-pw-fail:${collection.id}`;
  if (await isRateLimited(lockKey, WRONG_PASSWORDS_PER_GALLERY)) {
    throw new DomainError("GALLERY_LOCKED", "Muitas tentativas erradas nesta galeria. Por segurança, ela fica bloqueada por até 1 hora. Se você é o cliente, fale com o fotógrafo.");
  }
  if (!(await consumeRateLimit(`gallery-pw:${collection.id}:${ipHash}`, PASSWORD_TRIES_PER_IP, PASSWORD_IP_WINDOW))) {
    throw new DomainError("RATE_LIMITED", "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }
  if (!(await verifyGalleryPassword(collection.passwordHash, password))) {
    await consumeRateLimit(lockKey, WRONG_PASSWORDS_PER_GALLERY, GALLERY_LOCK_WINDOW);
    throw new DomainError("WRONG_PASSWORD", "Senha incorreta.");
  }
  // Upgrade the visitor's existing session so favourites made before a password change survive.
  const current = resolved.session;
  if (current && current.accessVersion === collection.accessVersion && current.expiresAt.getTime() > Date.now()) {
    await prisma.clientSession.update({ where: { id: current.id }, data: { passwordOk: true, lastSeenAt: new Date() } });
    return;
  }
  await openClientSession(collection, true);
}

const VIEW_WINDOW_SECONDS = 30 * 60;

/**
 * Who is looking, for analytics: the session when there is one, otherwise a
 * keyed hash of the IP (raw addresses are never stored). Read before the response.
 */
export async function visitorKeyFor(resolved: ResolvedGallery): Promise<{ key: string; sessionId?: string }> {
  if (resolved.decision.kind === "GRANTED" && resolved.decision.sessionValid && resolved.session) {
    return { key: resolved.session.id, sessionId: resolved.session.id };
  }
  return { key: (await requestMeta()).ipHash };
}

/** One GALLERY_VIEWED per visitor per 30 minutes; owner previews never count. */
export async function recordGalleryView(resolved: ResolvedGallery, visitor: { key: string; sessionId?: string }) {
  if (resolved.decision.kind !== "GRANTED" || resolved.decision.preview) return;
  const { collection } = resolved;
  if (!(await consumeRateLimit(`view:${collection.id}:${visitor.key}`, 1, VIEW_WINDOW_SECONDS))) return;
  await prisma.$transaction([
    prisma.activityLog.create({
      data: { userId: collection.userId, collectionId: collection.id, clientSessionId: visitor.sessionId, actorType: "CLIENT", type: "GALLERY_VIEWED" },
    }),
    prisma.collection.update({ where: { id: collection.id }, data: { lastAccessedAt: new Date() } }),
    ...(visitor.sessionId ? [prisma.clientSession.update({ where: { id: visitor.sessionId }, data: { lastSeenAt: new Date() } })] : []),
  ]);
}
