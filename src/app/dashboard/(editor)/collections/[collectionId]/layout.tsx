import type { Metadata } from "next";
import { EditorRail } from "@/components/admin/editor/editor-rail";
import { EditorTopBar } from "@/components/admin/editor/editor-top-bar";
import { loadEditorCollection } from "./_load";

type Params = Promise<{ collectionId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { collection } = await loadEditorCollection((await params).collectionId);
  return { title: collection.title };
}

/** Collection editor chrome: top bar + section rail; each section is its own route. */
export default async function CollectionEditorLayout({ params, children }: { params: Params; children: React.ReactNode }) {
  const { collection } = await loadEditorCollection((await params).collectionId);

  return (
    <div className="min-h-dvh bg-background">
      <EditorTopBar
        collection={{
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          status: collection.status,
          eventDate: collection.eventDate?.toISOString() ?? null,
          photoCount: collection.photoCount,
        }}
        summary={{
          hasCover: Boolean(collection.coverPhotoId),
          readyPhotos: collection.readyPhotoCount,
          expiresAt: collection.expiresAt?.toISOString() ?? null,
          expiryPassed: collection.expiryPassed,
          downloadQuality: collection.downloadQuality,
          allowIndividualDownload: collection.allowIndividualDownload,
          allowFullDownload: collection.allowFullDownload,
          allowFavorites: collection.allowFavorites,
          hasPassword: collection.hasPassword,
        }}
      />
      <div className="lg:flex">
        <EditorRail collection={collection} galleries={collection.galleries} selectionCount={collection.selectionCount} />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
