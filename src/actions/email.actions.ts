"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { sendGalleryEmail } from "@/services/email/email.service";

const sendSchema = z.object({
  collectionId: idSchema,
  recipient: z.email("Informe um e-mail válido").max(254),
  subject: z.string().trim().min(1, "Informe o assunto").max(150),
  message: z.string().trim().min(1, "Escreva uma mensagem").max(5000),
});

export async function sendGalleryEmailAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const data = sendSchema.parse(input);
    await sendGalleryEmail(user.id, data);
    revalidatePath(`/dashboard/collections/${data.collectionId}/sharing`);
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
