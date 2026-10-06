import "server-only";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { signDisplayUrl } from "@/lib/r2/signed-urls";
import { parseSiteContent, type SiteContent, siteContentSchema } from "@/lib/validation/site-content";
import type { PickableImage } from "@/types/site";

/** Editor data: current content, accent and the portfolio images that can be chosen. */
export async function getSiteEditorData(userId: string) {
  const [row, profile, images] = await Promise.all([
    prisma.siteContent.findUnique({ where: { userId }, select: { data: true } }),
    prisma.photographerProfile.findUnique({ where: { userId }, select: { accentColor: true } }),
    prisma.portfolioImage.findMany({
      where: { album: { userId }, status: "READY" },
      orderBy: [{ album: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      take: 300,
      select: { id: true, thumbnailKey: true, album: { select: { title: true } } },
    }),
  ]);
  const pickable: PickableImage[] = (
    await Promise.all(images.map(async (i) => ({ id: i.id, thumbUrl: (await signDisplayUrl(i.thumbnailKey)) ?? "", album: i.album.title })))
  ).filter((i) => i.thumbUrl);
  return { content: parseSiteContent(row?.data), accent: profile?.accentColor ?? "#A27B5C", images: pickable };
}

/** Validates, keeps only the photographer's own ready images, saves and refreshes the public site now. */
export async function saveSiteContent(userId: string, input: unknown, accent: string): Promise<SiteContent> {
  const content = siteContentSchema.parse(input);
  if (content.hero.imageIds.length) {
    const owned = await prisma.portfolioImage.findMany({
      where: { id: { in: content.hero.imageIds }, album: { userId }, status: "READY" },
      select: { id: true },
    });
    const ok = new Set(owned.map((i) => i.id));
    content.hero.imageIds = content.hero.imageIds.filter((id) => ok.has(id));
  }
  const data = content as unknown as Prisma.InputJsonValue;
  await prisma.$transaction([
    prisma.siteContent.upsert({ where: { userId }, create: { userId, data }, update: { data } }),
    prisma.photographerProfile.update({ where: { userId }, data: { accentColor: accent } }),
  ]);
  revalidatePath("/", "layout");
  return content;
}

/** Public read for the site owner's content (falls back to defaults). */
export async function readSiteContent(userId: string | null): Promise<SiteContent> {
  if (!userId) return parseSiteContent({});
  const row = await prisma.siteContent.findUnique({ where: { userId }, select: { data: true } });
  return parseSiteContent(row?.data);
}
