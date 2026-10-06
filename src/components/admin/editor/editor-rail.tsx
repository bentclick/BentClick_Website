import { CollectionCover } from "@/components/admin/collections/collection-cover";
import { EditorSections } from "./editor-sections";
import { GalleryList } from "./gallery-list";

type Gallery = { id: string; name: string; photoCount: number };

type EditorRailProps = {
  collection: { id: string; title: string; coverUrl: string | null; coverColor: string | null };
  galleries: Gallery[];
  selectionCount: number;
};

export function EditorRail({ collection, galleries, selectionCount }: EditorRailProps) {
  return (
    <aside className="border-b border-border bg-surface lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="hidden p-5 pb-2 lg:block">
        <CollectionCover
          title={collection.title}
          coverUrl={collection.coverUrl}
          coverColor={collection.coverColor}
          className="aspect-[3/2] rounded-[6px]"
        />
        {!collection.coverUrl ? (
          <p className="mt-2.5 text-[12px] text-muted-foreground">Defina a capa pelo menu ⋯ de qualquer foto enviada.</p>
        ) : null}
      </div>

      <EditorSections collectionId={collection.id} selectionCount={selectionCount}>
        <GalleryList collectionId={collection.id} galleries={galleries} />
      </EditorSections>
    </aside>
  );
}
