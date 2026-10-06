"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { photoIdsSchema } from "@/lib/validation/gallery";
import { createAlbumSchema, updateAlbumSchema } from "@/lib/validation/portfolio";
import { createAlbum, deleteAlbum, deletePortfolioImages, setAlbumCover, updateAlbum } from "@/services/portfolio/portfolio.service";

/** Portfolio changes show on the public site immediately (not after the ISR window). */
function revalidatePortfolio() {
  revalidatePath("/dashboard/portfolio", "layout");
  revalidatePath("/", "layout");
}

async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await assertUser();
    const result = await fn(user.id);
    revalidatePortfolio();
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAlbumAction(input: unknown) {
  return run((userId) => createAlbum(userId, createAlbumSchema.parse(input)));
}

export async function updateAlbumAction(input: unknown) {
  return run(async (userId) => {
    const { albumId, ...data } = updateAlbumSchema.parse(input);
    await updateAlbum(userId, albumId, data);
  });
}

export async function deleteAlbumAction(albumId: unknown) {
  return run((userId) => deleteAlbum(userId, idSchema.parse(albumId)));
}

export async function setAlbumCoverAction(imageId: unknown) {
  return run((userId) => setAlbumCover(userId, idSchema.parse(imageId)));
}

export async function deletePortfolioImagesAction(imageIds: unknown) {
  return run((userId) => deletePortfolioImages(userId, photoIdsSchema.parse(imageIds)));
}
