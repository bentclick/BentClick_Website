"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { watermarkSchema } from "@/lib/validation/watermark";
import { setCollectionWatermark } from "@/services/photos/preview-refresh.service";
import { createWatermark, deleteWatermark, updateWatermark } from "@/services/watermarks/watermark.service";

/** FormData carries the settings as JSON plus an optional logo file. */
function readForm(form: FormData) {
  const data = watermarkSchema.parse(JSON.parse(String(form.get("data") ?? "{}")));
  const logo = form.get("logo");
  return { data, logo: logo instanceof File && logo.size > 0 ? logo : null };
}

function revalidate() {
  revalidatePath("/dashboard/settings", "layout");
  revalidatePath("/dashboard/collections", "layout");
}

export async function saveWatermarkAction(form: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await assertUser();
    const { data, logo } = readForm(form);
    const id = form.get("watermarkId");
    if (typeof id === "string" && id) {
      await updateWatermark(user.id, idSchema.parse(id), data, logo);
      revalidate();
      return ok({ id });
    }
    const created = await createWatermark(user.id, data, logo);
    revalidate();
    return ok(created);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteWatermarkAction(watermarkId: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await deleteWatermark(user.id, idSchema.parse(watermarkId));
    revalidate();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

const collectionWatermarkSchema = z.object({ collectionId: idSchema, watermarkId: z.union([idSchema, z.literal("")]) });

export async function setCollectionWatermarkAction(input: unknown): Promise<ActionResult<{ outdated: number }>> {
  try {
    const user = await assertUser();
    const { collectionId, watermarkId } = collectionWatermarkSchema.parse(input);
    const result = await setCollectionWatermark(user.id, collectionId, watermarkId || null);
    revalidatePath(`/dashboard/collections/${collectionId}`, "layout");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
