import "server-only";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { getR2 } from "@/lib/r2/client";
import { deleteObjects } from "@/lib/r2/objects";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import type { AlbumInput } from "@/lib/validation/portfolio";
import { DomainError, NotFoundError } from "@/services/errors";
import type { PortfolioImageItem } from "@/types/portfolio";
import { albumSlugTaken, findOwnedAlbum, findOwnedImages, insertAlbum, listAlbumImages, listAlbums } from "./portfolio.repository";

export type AlbumSummary = {
  id: string;
  title: string;
  category: PortfolioCategory;
  isPublished: boolean;
  imageCount: number;
  coverUrl: string | null;
  coverColor: string | null;
};

/** "Casamento Ana & Rafael" → "casamento-ana-rafael", unique per photographer. */
async function uniqueSlug(userId: string, title: string, exceptId?: string) {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "album";
  let slug = base;
  for (let i = 2; await albumSlugTaken(prisma, userId, slug, exceptId); i++) slug = `${base}-${i}`;
  return slug;
}

export async function listPortfolioAlbums(userId: string): Promise<AlbumSummary[]> {
  const rows = await listAlbums(prisma, userId);
  return Promise.all(
    rows.map(async (a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      isPublished: a.isPublished,
      imageCount: a._count.images,
      coverUrl: await signDisplayUrl(a.images[0]?.previewKey ?? a.images[0]?.thumbnailKey),
      coverColor: a.images[0]?.dominantColor ?? null,
    })),
  );
}

export async function getAlbum(userId: string, albumId: string) {
  const album = await findOwnedAlbum(prisma, userId, albumId);
  if (!album) throw new NotFoundError("Album");
  const images = await listAlbumImages(prisma, album.id);
  const items: PortfolioImageItem[] = await Promise.all(
    images.map(async (i) => ({
      id: i.id,
      filename: i.filename,
      status: i.status,
      sizeBytes: Number(i.fileSize),
      thumbnailUrl: await signDisplayUrl(i.thumbnailKey),
      color: i.dominantColor,
      isCover: i.isCover,
    })),
  );
  return { album, images: items };
}

export async function createAlbum(userId: string, input: AlbumInput) {
  return insertAlbum(prisma, {
    userId,
    title: input.title,
    slug: await uniqueSlug(userId, input.title),
    category: input.category,
    description: input.description || null,
    isPublished: input.isPublished,
  });
}

export async function updateAlbum(userId: string, albumId: string, input: AlbumInput) {
  const album = await findOwnedAlbum(prisma, userId, albumId);
  if (!album) throw new NotFoundError("Album");
  if (input.isPublished) {
    const ready = await prisma.portfolioImage.count({ where: { albumId: album.id, status: "READY" } });
    if (ready === 0) throw new DomainError("EMPTY_ALBUM", "Adicione fotos antes de publicar o álbum.");
  }
  await prisma.portfolioAlbum.update({
    where: { id: album.id },
    data: {
      title: input.title,
      slug: input.title === album.title ? album.slug : await uniqueSlug(userId, input.title, album.id),
      category: input.category,
      description: input.description || null,
      isPublished: input.isPublished,
    },
  });
}

/** One cover per album; it also feeds the homepage hero. */
export async function setAlbumCover(userId: string, imageId: string) {
  const [image] = await findOwnedImages(prisma, userId, [imageId]);
  if (!image) throw new NotFoundError("Image");
  if (image.status !== "READY") throw new DomainError("NOT_READY", "Aguarde a prévia ficar pronta.");
  await prisma.$transaction([
    prisma.portfolioImage.updateMany({ where: { albumId: image.albumId }, data: { isCover: false } }),
    prisma.portfolioImage.update({ where: { id: image.id }, data: { isCover: true } }),
  ]);
}

export async function deletePortfolioImages(userId: string, imageIds: string[]) {
  const images = await findOwnedImages(prisma, userId, imageIds);
  if (images.length !== imageIds.length) throw new NotFoundError("Image");
  if (getR2()) {
    await deleteObjects(images.flatMap((i) => [i.storageKey, i.previewKey, i.thumbnailKey].filter((k): k is string => Boolean(k))));
  }
  await prisma.portfolioImage.deleteMany({ where: { id: { in: images.map((i) => i.id) } } });
  return images.length;
}

export async function deleteAlbum(userId: string, albumId: string) {
  const album = await findOwnedAlbum(prisma, userId, albumId);
  if (!album) throw new NotFoundError("Album");
  const images = await prisma.portfolioImage.findMany({ where: { albumId: album.id }, select: { id: true } });
  if (images.length) await deletePortfolioImages(userId, images.map((i) => i.id));
  await prisma.portfolioAlbum.delete({ where: { id: album.id } });
}
