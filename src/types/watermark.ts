import type { WatermarkInput } from "@/lib/validation/watermark";

export type WatermarkOption = { id: string; name: string };

export type WatermarkItem = WatermarkInput & { id: string; logoUrl: string | null; usedBy: number };
