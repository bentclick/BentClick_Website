import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DevelopEditor } from "@/components/admin/develop/develop-editor";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { NotFoundError } from "@/services/errors";
import { MAX_DEVELOP_BATCH } from "@/lib/develop/develop-batch";
import { getBatchDevelopSession } from "@/services/photos/photo-develop.service";

export const metadata: Metadata = { title: "Revelar álbum" };

/** `?galeria=<id>` narrows to one gallery, `?fotos=<id>,<id>` to the photos chosen in the grid. */
const scopeSchema = z.object({
  galeria: idSchema.optional(),
  fotos: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(idSchema).min(1).max(MAX_DEVELOP_BATCH))
    .optional(),
});

type Props = { params: Promise<{ collectionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DevelopAlbumPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const collectionId = idSchema.safeParse((await params).collectionId);
  const scope = scopeSchema.safeParse(await searchParams);
  if (!collectionId.success || !scope.success) notFound();

  const session = await getBatchDevelopSession(user.id, collectionId.data, { galleryId: scope.data.galeria, photoIds: scope.data.fotos }).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  return <DevelopEditor session={session} />;
}
