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

export function listHeroImages(db: Db, userId: string, take: number) {
  return db.portfolioImage.findMany({
    where: { isCover: true, previewKey: { not: null }, album: { userId, isPublished: true } },
    orderBy: [{ album: { sortOrder: "asc" } }],
    take,
    select: publicImageSelect,
  });
}
