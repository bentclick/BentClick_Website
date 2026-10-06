import "server-only";
import { cache } from "react";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import type { PublicImage, SiteProfile } from "@/types/site";
import { findSiteOwnerProfile, listHeroImages, listPublicPortfolioImages } from "./site.repository";

const getOwner = cache(() => findSiteOwnerProfile(prisma));

export async function getSiteProfile(): Promise<SiteProfile | null> {
  const owner = await getOwner();
  if (!owner) return null;
  return {
    name: owner.user.name,
    tagline: owner.tagline,
    bio: owner.bio,
    email: owner.replyToEmail,
    instagram: owner.instagram,
    websiteUrl: owner.websiteUrl,
  };
}

type ImageRow = Awaited<ReturnType<typeof listPublicPortfolioImages>>[number];

async function toPublicImages(rows: ImageRow[]): Promise<PublicImage[]> {
  const images = await Promise.all(
    rows.map(async (row) => {
      const src = await signDisplayUrl(row.previewKey);
      if (!src) return null;
      return {
        id: row.id,
        src,
        width: row.width ?? 3,
        height: row.height ?? 2,
        alt: row.caption ?? row.album.title,
        category: row.album.category,
      } satisfies PublicImage;
    }),
  );
  return images.filter((image): image is PublicImage => image !== null);
}

export async function getPortfolioImages(category: PortfolioCategory | null, take = 120): Promise<PublicImage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  return toPublicImages(await listPublicPortfolioImages(prisma, owner.userId, category, take));
}

/** Up to three album covers for the homepage hero. */
export async function getHeroImages(): Promise<PublicImage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  return toPublicImages(await listHeroImages(prisma, owner.userId, 3));
}
