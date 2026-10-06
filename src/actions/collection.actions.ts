"use server";

import { revalidatePath } from "next/cache";
import { assertUser } from "@/lib/auth/session";
import { type ActionResult, ok, toActionError } from "@/lib/actions/result";
import { collectionIdSchema, createCollectionSchema } from "@/lib/validation/collection";
import {
  archiveCollection,
  createCollection,
  deleteCollection,
  duplicateCollection,
  publishCollection,
  restoreCollection,
  unpublishCollection,
} from "@/services/collections/collection.service";

const COLLECTIONS_PATH = "/dashboard/collections";

export async function createCollectionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await assertUser();
    const data = createCollectionSchema.parse(input);
    const created = await createCollection(user.id, data);
    revalidatePath(COLLECTIONS_PATH);
    return ok(created);
  } catch (error) {
    return toActionError(error);
  }
}

type CollectionCommand = (userId: string, collectionId: string) => Promise<unknown>;

/** Shared wrapper: authenticate, validate the id, run the owner-scoped command. */
async function runCommand(command: CollectionCommand, collectionId: unknown): Promise<ActionResult> {
  try {
    const user = await assertUser();
    const id = collectionIdSchema.parse(collectionId);
    await command(user.id, id);
    revalidatePath(COLLECTIONS_PATH, "layout");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function publishCollectionAction(collectionId: string) {
  return runCommand(publishCollection, collectionId);
}

export async function unpublishCollectionAction(collectionId: string) {
  return runCommand(unpublishCollection, collectionId);
}

export async function archiveCollectionAction(collectionId: string) {
  return runCommand(archiveCollection, collectionId);
}

export async function restoreCollectionAction(collectionId: string) {
  return runCommand(restoreCollection, collectionId);
}

export async function deleteCollectionAction(collectionId: string) {
  return runCommand(deleteCollection, collectionId);
}

export async function duplicateCollectionAction(collectionId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await assertUser();
    const copy = await duplicateCollection(user.id, collectionIdSchema.parse(collectionId));
    revalidatePath(COLLECTIONS_PATH);
    return ok(copy);
  } catch (error) {
    return toActionError(error);
  }
}
