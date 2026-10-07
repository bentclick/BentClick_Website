"use server";

import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { accentSchema } from "@/lib/validation/site-content";
import { removePortrait, setPortrait } from "@/services/site/portrait.service";
import { saveSiteContent } from "@/services/site/site-content.service";

const inputSchema = z.object({ content: z.unknown(), accent: accentSchema });

/** Saves the whole site document; the public site revalidates immediately. */
export async function saveSiteContentAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const { content, accent } = inputSchema.parse(input);
    await saveSiteContent(user.id, content, accent);
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

/** Photographer's own photo for the About page (already shrunk in the browser). */
export async function uploadPortraitAction(form: FormData): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const file = form.get("portrait");
    if (!(file instanceof File)) return { ok: false, error: "Escolha uma foto." };
    await setPortrait(user.id, file);
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePortraitAction(): Promise<ActionResult> {
  try {
    const user = await assertUser();
    await removePortrait(user.id);
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
