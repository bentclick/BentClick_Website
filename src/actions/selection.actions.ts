"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { clearSelection } from "@/services/favorites/selections.service";

export async function clearSelectionAction(clientSessionId: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { collectionId } = await clearSelection(user.id, idSchema.parse(clientSessionId));
    revalidatePath(`/dashboard/collections/${collectionId}`, "layout");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
