import { EditorPhotos } from "@/components/admin/editor/editor-photos";
import { listEditorPhotos } from "@/services/photos/photo.service";
import { loadEditorCollection } from "./_load";

type Props = { params: Promise<{ collectionId: string }>; searchParams: Promise<{ gallery?: string }> };

/** Fotos section: the selected gallery's grid and uploads. */
export default async function CollectionPhotosPage({ params, searchParams }: Props) {
  const [{ collectionId }, { gallery: galleryParam }] = await Promise.all([params, searchParams]);
  const { user, collection } = await loadEditorCollection(collectionId);
  const activeGallery = collection.galleries.find((g) => g.id === galleryParam) ?? collection.galleries[0] ?? null;
  if (!activeGallery) return null;
  const photos = await listEditorPhotos(user.id, activeGallery.id);

  return (
    <EditorPhotos key={activeGallery.id} collectionId={collection.id} gallery={activeGallery} photos={photos} coverPhotoId={collection.coverPhotoId} />
  );
}
