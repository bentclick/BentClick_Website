import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { collectionIdSchema } from "@/lib/validation/collection";
import { getCollectionForEditor } from "@/services/collections/collection.service";
import { NotFoundError } from "@/services/errors";

/** Shared by the editor layout and every section page (deduplicated per request). */
export async function loadEditorCollection(collectionId: string) {
  const user = await requireUser();
  const id = collectionIdSchema.safeParse(collectionId);
  if (!id.success) notFound();
  try {
    return { user, collection: await getCollectionForEditor(user.id, id.data) };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
