import "server-only";
import { cache } from "react";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import type { SiteContent } from "@/lib/validation/site-content";
import type { PublicImage, SiteProfile } from "@/types/site";
import { readSiteContent } from "./site-content.service";
import { findSiteOwnerProfile, listHeroImages, listImagesByIds, listPublicPortfolioImages } from "./site.repository";

const getOwner = cache(() => findSiteOwnerProfile(prisma));

/** Everything a public page needs: owner profile, editable content and brand accent. */
export const getSite = cache(async (): Promise<{ profile: SiteProfile | null; content: SiteContent; accent: string }> => {
  const owner = await getOwner();
  const content = await readSiteContent(owner?.userId ?? null);
  const portraitSrc = await signDisplayUrl(owner?.portraitKey);
  const profile: SiteProfile | null = owner
    ? {
        name: owner.user.name,
        tagline: owner.tagline,
        bio: owner.bio,
        email: content.contact.email || owner.replyToEmail,
        instagram: content.contact.instagram || owner.instagram,
        websiteUrl: content.contact.website || owner.websiteUrl,
        portrait: portraitSrc ? { src: portraitSrc, width: owner.portraitWidth ?? 4, height: owner.portraitHeight ?? 5 } : null,
      }
    : null;
  return { profile, content, accent: owner?.accentColor ?? "#A27B5C" };
});

export async function getSiteProfile(): Promise<SiteProfile | null> {
  return (await getSite()).profile;
}

type ImageRow = Awaited<ReturnType<typeof listPublicPortfolioImages>>[number];

async function toPublicImages(rows: ImageRow[]): Promise<PublicImage[]> {
  const images = await Promise.all(
    rows.map(async (row) => {
      const src = await signDisplayUrl(row.previewKey);
      if (!src) return null;
      return { id: row.id, src, width: row.width ?? 3, height: row.height ?? 2, alt: row.caption ?? row.album.title, category: row.album.category } satisfies PublicImage;
    }),
  );
  return images.filter((image): image is PublicImage => image !== null);
}

export async function getPortfolioImages(category: PortfolioCategory | null, take = 120): Promise<PublicImage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  return toPublicImages(await listPublicPortfolioImages(prisma, owner.userId, category, take));
}

/** The photos chosen in the site editor, in that order; otherwise up to three album covers. */
export async function getHeroImages(content: SiteContent): Promise<PublicImage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  if (content.hero.imageIds.length) {
    const rows = await listImagesByIds(prisma, owner.userId, content.hero.imageIds);
    const order = new Map(content.hero.imageIds.map((id, i) => [id, i]));
    const chosen = await toPublicImages(rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    if (chosen.length) return chosen;
  }
  return toPublicImages(await listHeroImages(prisma, owner.userId, 3));
}
