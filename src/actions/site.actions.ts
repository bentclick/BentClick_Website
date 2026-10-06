"use server";

import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { accentSchema } from "@/lib/validation/site-content";
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
