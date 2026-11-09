import "server-only";
import { cache } from "react";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import type { SiteContent } from "@/lib/validation/site-content";
import { interleave } from "@/lib/utils/interleave";
import type { PublicAlbum, PublicImage, SiteProfile } from "@/types/site";
import { readSiteContent } from "./site-content.service";
import { findPublicAlbumBySlug, findSiteOwnerProfile, listHeroImages, listImagesByIds, listImagesPerAlbum, listPublicAlbums, listPublicPortfolioImages } from "./site.repository";

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

/** Photos picked in the site editor, in the order they were picked. */
async function chosenImages(userId: string, ids: string[]): Promise<PublicImage[]> {
  if (ids.length === 0) return [];
  const rows = await listImagesByIds(prisma, userId, ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  return toPublicImages(rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
}

/** The photos chosen in the site editor; otherwise up to three album covers. */
export async function getHeroImages(content: SiteContent): Promise<PublicImage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  const chosen = await chosenImages(owner.userId, content.hero.imageIds);
  return chosen.length ? chosen : toPublicImages(await listHeroImages(prisma, owner.userId, 3));
}

/** Homepage "Trabalhos": the photos chosen in the editor; otherwise alternates between published albums. */
export async function getFeaturedWorks(content: SiteContent): Promise<PublicImage[]> {
  const owner = await getOwner();
  if (!owner) return [];
  const chosen = await chosenImages(owner.userId, content.works.imageIds);
  if (chosen.length) return chosen;
  const albums = await listImagesPerAlbum(prisma, owner.userId, content.works.count);
  return toPublicImages(interleave(albums.map((a) => a.images), content.works.count));
}

export async function getPublicAlbums(category: PortfolioCategory | null): Promise<PublicAlbum[]> {
  const owner = await getOwner();
  if (!owner) return [];
  const albums = await listPublicAlbums(prisma, owner.userId, category);
  const items = await Promise.all(
    albums.map(async ({ images, _count, ...album }) => {
      const coverUrl = await signDisplayUrl(images[0]?.previewKey);
      return coverUrl ? { ...album, imageCount: _count.images, coverUrl, color: images[0]?.dominantColor ?? null } : null;
    }),
  );
  return items.filter((a): a is PublicAlbum => a !== null);
}

export const getPublicAlbum = cache(async (slug: string) => {
  const owner = await getOwner();
  if (!owner) return null;
  const album = await findPublicAlbumBySlug(prisma, owner.userId, slug);
  if (!album) return null;
  return { title: album.title, description: album.description, category: album.category, images: await toPublicImages(album.images) };
});
