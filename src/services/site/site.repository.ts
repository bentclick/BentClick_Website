import "server-only";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import type { Db } from "@/lib/db/types";

/** Single-photographer product: the public site belongs to the first studio created. */
export function findSiteOwnerProfile(db: Db) {
  return db.photographerProfile.findFirst({
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });
}

const publicImageSelect = {
  id: true,
  previewKey: true,
  thumbnailKey: true,
  width: true,
  height: true,
  caption: true,
  album: { select: { title: true, category: true } },
} as const;

/** Only images from published albums, with a generated preview, are ever public. */
export function listPublicPortfolioImages(db: Db, userId: string, category: PortfolioCategory | null, take: number) {
  return db.portfolioImage.findMany({
    where: {
      previewKey: { not: null },
      album: { userId, isPublished: true, ...(category ? { category } : {}) },
    },
    orderBy: [{ album: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take,
    select: publicImageSelect,
  });
}

const readyImage = { status: "READY", previewKey: { not: null } } as const;
const albumOrder = [{ sortOrder: "asc" }, { createdAt: "desc" }] as const;
const coverFirst = [{ isCover: "desc" }, { sortOrder: "asc" }] as const;

/** Published albums that have something to show, in the order set in the dashboard. */
export function listPublicAlbums(db: Db, userId: string, category: PortfolioCategory | null) {
  return db.portfolioAlbum.findMany({
    where: { userId, isPublished: true, images: { some: readyImage }, ...(category ? { category } : {}) },
    orderBy: [...albumOrder],
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      _count: { select: { images: { where: readyImage } } },
      images: { where: readyImage, orderBy: [...coverFirst], take: 1, select: { previewKey: true, dominantColor: true } },
    },
  });
}

/** Up to `perAlbum` photos of each published album (cover first), so a large album can't crowd out the others. */
export function listImagesPerAlbum(db: Db, userId: string, perAlbum: number) {
  return db.portfolioAlbum.findMany({
    where: { userId, isPublished: true },
    orderBy: [...albumOrder],
    select: { images: { where: readyImage, orderBy: [...coverFirst], take: perAlbum, select: publicImageSelect } },
  });
}

export function findPublicAlbumBySlug(db: Db, userId: string, slug: string) {
  return db.portfolioAlbum.findFirst({
    where: { userId, slug, isPublished: true },
    select: {
      title: true,
      description: true,
      category: true,
      images: { where: readyImage, orderBy: { sortOrder: "asc" }, take: 300, select: publicImageSelect },
    },
  });
}

export function listHeroImages(db: Db, userId: string, take: number) {
  return db.portfolioImage.findMany({
    where: { isCover: true, previewKey: { not: null }, album: { userId, isPublished: true } },
    orderBy: [{ album: { sortOrder: "asc" } }],
    take,
    select: publicImageSelect,
  });
}

/** Specific portfolio images chosen for the hero, owned and ready (any album, published or not). */
export function listImagesByIds(db: Db, userId: string, ids: string[]) {
  return db.portfolioImage.findMany({
    where: { id: { in: ids }, status: "READY", previewKey: { not: null }, album: { userId } },
    select: publicImageSelect,
  });
}
