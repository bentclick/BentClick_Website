"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { photoIdsSchema } from "@/lib/validation/gallery";
import { deletePhotos, setCoverPhoto } from "@/services/photos/photo.service";

export async function setCoverPhotoAction(photoId: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await setCoverPhoto(user.id, idSchema.parse(photoId));
    revalidatePath("/dashboard/collections", "layout");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePhotosAction(photoIds: unknown): Promise<ActionResult<{ deleted: number }>> {
  try {
    const user = await assertUser();
    const deleted = await deletePhotos(user.id, photoIdsSchema.parse(photoIds));
    revalidatePath("/dashboard/collections", "layout");
    return ok({ deleted });
  } catch (error) {
    return toActionError(error);
  }
}
