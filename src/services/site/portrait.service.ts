import "server-only";
import { revalidatePath } from "next/cache";
import sharp, { type OutputInfo } from "sharp";
import { prisma } from "@/lib/db/prisma";
import { getR2 } from "@/lib/r2/client";
import { r2Keys } from "@/lib/r2/keys";
import { deleteObjects, writeObject } from "@/lib/r2/objects";
import { DomainError } from "@/services/errors";

/** The browser shrinks the photo before sending; this is the server-side ceiling. */
const MAX_BYTES = 2.5 * 1024 * 1024;
const MAX_EDGE = 1600;
const ACCEPTED = new Set(["jpeg", "png", "webp"]);

/**
 * The photographer's own photo for the About page. Validated by its real
 * content, re-encoded (metadata stripped), stored under the owner's prefix
 * with a fresh key so browsers never show the previous one.
 */
export async function setPortrait(userId: string, file: File): Promise<void> {
  if (!getR2()) throw new DomainError("STORAGE_UNAVAILABLE", "O armazenamento ainda não está configurado.");
  if (file.size > MAX_BYTES) throw new DomainError("PORTRAIT_SIZE", "A foto é grande demais. Tente outra imagem.");

  let output: { data: Buffer; info: OutputInfo };
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 60_000_000 });
    const { format } = await input.metadata();
    if (!format || !ACCEPTED.has(format)) throw new Error("format");
    output = await input.rotate().resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  } catch {
    throw new DomainError("PORTRAIT_INVALID", "Use uma foto JPG, PNG ou WebP.");
  }

  const key = r2Keys.brandAsset(userId, `portrait-${Date.now()}`, "webp");
  await writeObject(key, output.data, "image/webp");
  const previous = await prisma.photographerProfile.findUnique({ where: { userId }, select: { portraitKey: true } });
  await prisma.photographerProfile.update({
    where: { userId },
    data: { portraitKey: key, portraitWidth: output.info.width, portraitHeight: output.info.height },
  });
  if (previous?.portraitKey) await deleteObjects([previous.portraitKey]).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function removePortrait(userId: string): Promise<void> {
  const profile = await prisma.photographerProfile.findUnique({ where: { userId }, select: { portraitKey: true } });
  if (!profile?.portraitKey) return;
  await prisma.photographerProfile.update({ where: { userId }, data: { portraitKey: null, portraitWidth: null, portraitHeight: null } });
  await deleteObjects([profile.portraitKey]).catch(() => undefined);
  revalidatePath("/", "layout");
}
