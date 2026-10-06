import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { WatermarkOption } from "@/types/watermark";

export function listWatermarkOptions(userId: string): Promise<WatermarkOption[]> {
  return prisma.watermark.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
