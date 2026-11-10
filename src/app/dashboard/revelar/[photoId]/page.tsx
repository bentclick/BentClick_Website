import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevelopEditor } from "@/components/admin/develop/develop-editor";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation/common";
import { NotFoundError } from "@/services/errors";
import { getDevelopSession } from "@/services/photos/photo-develop.service";

export const metadata: Metadata = { title: "Revelar" };

export default async function DevelopPage({ params }: { params: Promise<{ photoId: string }> }) {
  const user = await requireUser();
  const photoId = idSchema.safeParse((await params).photoId);
  if (!photoId.success) notFound();

  const session = await getDevelopSession(user.id, photoId.data).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  return <DevelopEditor session={session} />;
}
