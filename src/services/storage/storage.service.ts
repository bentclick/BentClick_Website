import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export type StorageUsage = { usedBytes: number; quotaBytes: number; ratio: number };

/** Usage is always computed from file rows — never trusted from a stored counter. */
export const getStorageUsage = cache(async (userId: string): Promise<StorageUsage> => {
  const [photos, portfolio, profile] = await Promise.all([
    prisma.photo.aggregate({ where: { userId }, _sum: { fileSize: true } }),
    prisma.portfolioImage.aggregate({ where: { album: { userId } }, _sum: { fileSize: true } }),
    prisma.photographerProfile.findUnique({ where: { userId }, select: { storageQuotaBytes: true } }),
  ]);

  const usedBytes = Number(photos._sum.fileSize ?? 0n) + Number(portfolio._sum.fileSize ?? 0n);
  const quotaBytes = Number(profile?.storageQuotaBytes ?? 100n * 1024n ** 3n);
  return { usedBytes, quotaBytes, ratio: quotaBytes > 0 ? Math.min(usedBytes / quotaBytes, 1) : 0 };
});
