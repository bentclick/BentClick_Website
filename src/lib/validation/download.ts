import { z } from "zod";
import { idSchema } from "./common";

export const visitorArchiveSchema = z.object({ scope: z.enum(["all", "favorites"]) });

export const ownerArchiveSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({ scope: z.literal("selection"), sessionId: idSchema }),
]);

export const partIndexSchema = z.coerce.number().int().min(0).max(999);
