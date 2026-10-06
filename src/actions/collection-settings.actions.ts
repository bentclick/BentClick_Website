"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { assertUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { accessSchema, detailsSchema, expirySchema, linkSchema, passwordSchema, permissionsSchema } from "@/lib/validation/collection-settings";
import {
  regenerateLink,
  setLinkEnabled,
  setPassword,
  updateAccess,
  updateDetails,
  updateExpiry,
  updatePermissions,
} from "@/services/collections/collection-settings.service";

function revalidate(collectionId: string) {
  revalidatePath(`/dashboard/collections/${collectionId}`, "layout");
  revalidatePath("/dashboard/collections");
}

async function run<T>(fn: (userId: string) => Promise<T>, collectionId: string): Promise<ActionResult<T>> {
  try {
    const user = await assertUser();
    const result = await fn(user.id);
    revalidate(collectionId);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDetailsAction(input: unknown) {
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return toActionError(parsed.error);
  return run((userId) => updateDetails(userId, parsed.data), parsed.data.collectionId);
}

export async function updateExpiryAction(input: unknown) {
  const parsed = expirySchema.safeParse(input);
  if (!parsed.success) return toActionError(parsed.error);
  return run((userId) => updateExpiry(userId, parsed.data), parsed.data.collectionId);
}

export async function updateAccessAction(input: unknown) {
  const parsed = accessSchema.safeParse(input);
  if (!parsed.success) return toActionError(parsed.error);
  return run((userId) => updateAccess(userId, parsed.data), parsed.data.collectionId);
}

export async function setPasswordAction(input: unknown) {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return toActionError(parsed.error);
  return run((userId) => setPassword(userId, parsed.data.collectionId, parsed.data.password), parsed.data.collectionId);
}

export async function updatePermissionsAction(input: unknown) {
  const parsed = permissionsSchema.safeParse(input);
  if (!parsed.success) return toActionError(parsed.error);
  return run((userId) => updatePermissions(userId, parsed.data), parsed.data.collectionId);
}

export async function regenerateLinkAction(collectionId: unknown) {
  const id = idSchema.safeParse(collectionId);
  if (!id.success) return toActionError(id.error);
  return run((userId) => regenerateLink(userId, id.data), id.data);
}

export async function setLinkEnabledAction(input: unknown) {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return toActionError(parsed.error);
  return run((userId) => setLinkEnabled(userId, parsed.data.collectionId, parsed.data.enabled), parsed.data.collectionId);
}
