import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorPhotos } from "@/components/admin/editor/editor-photos";
import { EditorRail } from "@/components/admin/editor/editor-rail";
import { EditorTopBar } from "@/components/admin/editor/editor-top-bar";
import { requireUser } from "@/lib/auth/session";
import { collectionIdSchema } from "@/lib/validation/collection";
import { getCollectionForEditor } from "@/services/collections/collection.service";
import { NotFoundError } from "@/services/errors";
import { listEditorPhotos } from "@/services/photos/photo.service";

type Params = Promise<{ collectionId: string }>;
type SearchParams = Promise<{ gallery?: string }>;

async function loadCollection(collectionId: string) {
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { collection } = await loadCollection((await params).collectionId);
  return { title: collection.title };
}

export default async function CollectionEditorPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ collectionId }, { gallery: galleryParam }] = await Promise.all([params, searchParams]);
  const { user, collection } = await loadCollection(collectionId);
  const activeGallery = collection.galleries.find((g) => g.id === galleryParam) ?? collection.galleries[0] ?? null;
  const photos = activeGallery ? await listEditorPhotos(user.id, activeGallery.id) : [];

  return (
    <div className="min-h-dvh bg-background">
      <EditorTopBar
        collection={{
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          status: collection.status,
          eventDate: collection.eventDate?.toISOString() ?? null,
        }}
      />
      <div className="lg:flex">
        <EditorRail collection={collection} galleries={collection.galleries} activeGalleryId={activeGallery?.id ?? null} />

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          {activeGallery ? (
            <EditorPhotos
              key={activeGallery.id}
              collectionId={collection.id}
              gallery={activeGallery}
              photos={photos}
              coverPhotoId={collection.coverPhotoId}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
