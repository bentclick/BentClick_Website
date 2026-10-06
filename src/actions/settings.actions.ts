"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { galleryDefaultsSchema, profileSchema } from "@/lib/validation/settings";
import { updateGalleryDefaults, updateProfile } from "@/services/settings/settings.service";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await updateProfile(user.id, profileSchema.parse(input));
    revalidatePath("/dashboard", "layout");
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateGalleryDefaultsAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await updateGalleryDefaults(user.id, galleryDefaultsSchema.parse(input));
    revalidatePath("/dashboard/settings");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
