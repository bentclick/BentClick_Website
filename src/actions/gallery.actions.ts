"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { createGallerySchema, galleryIdSchema, renameGallerySchema } from "@/lib/validation/gallery";
import { createGallery, deleteOwnedGallery, renameOwnedGallery } from "@/services/galleries/gallery.service";

const editorPath = (collectionId: string) => `/dashboard/collections/${collectionId}`;

export async function createGalleryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await assertUser();
    const { collectionId, name } = createGallerySchema.parse(input);
    const gallery = await createGallery(user.id, collectionId, name);
    revalidatePath(editorPath(collectionId));
    return ok(gallery);
  } catch (error) {
    return toActionError(error);
  }
}

export async function renameGalleryAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { galleryId, name } = renameGallerySchema.parse(input);
    await renameOwnedGallery(user.id, galleryId, name);
    revalidatePath("/dashboard/collections", "layout");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteGalleryAction(galleryId: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { collectionId } = await deleteOwnedGallery(user.id, galleryIdSchema.parse(galleryId));
    revalidatePath(editorPath(collectionId));
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
