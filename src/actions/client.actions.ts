"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { clientSchema } from "@/lib/validation/settings";
import { createClientRecord, deleteClientRecord, updateClientRecord } from "@/services/clients/client.service";

async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await assertUser();
    const result = await fn(user.id);
    revalidatePath("/dashboard", "layout");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createClientAction(input: unknown) {
  return run((userId) => createClientRecord(userId, clientSchema.parse(input)));
}

export async function updateClientAction(clientId: unknown, input: unknown) {
  return run((userId) => updateClientRecord(userId, idSchema.parse(clientId), clientSchema.parse(input)));
}

export async function deleteClientAction(clientId: unknown) {
  return run((userId) => deleteClientRecord(userId, idSchema.parse(clientId)));
}
