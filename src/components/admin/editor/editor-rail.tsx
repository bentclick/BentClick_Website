import { Images, Palette, Settings2, Share2 } from "lucide-react";
import { CollectionCover } from "@/components/admin/collections/collection-cover";
import { cn } from "@/lib/utils/cn";
import { GalleryList } from "./gallery-list";

type Gallery = { id: string; name: string; photoCount: number };

type EditorRailProps = {
  collection: { id: string; title: string; coverUrl: string | null; coverColor: string | null };
  galleries: Gallery[];
  activeGalleryId: string | null;
};

// Design / Configurações / Compartilhamento panels arrive with phases 4, 7–8 and 9.
const TABS = [
  { key: "photos", label: "Fotos", icon: Images, enabled: true },
  { key: "design", label: "Design", icon: Palette, enabled: false },
  { key: "settings", label: "Configurações", icon: Settings2, enabled: false },
  { key: "sharing", label: "Compartilhamento", icon: Share2, enabled: false },
] as const;

export function EditorRail({ collection, galleries, activeGalleryId }: EditorRailProps) {
  return (
    <aside className="border-b border-border bg-surface lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="hidden p-5 pb-4 lg:block">
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

      <nav aria-label="Seções da coleção" className="grid grid-cols-4 border-y border-border">
        {TABS.map(({ key, label, icon: Icon, enabled }) => (
          <span
            key={key}
            title={enabled ? label : `${label} — em breve`}
            aria-current={key === "photos" ? "page" : undefined}
            aria-disabled={!enabled || undefined}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 px-1 py-3 text-center text-[10px] leading-tight text-muted-foreground [hyphens:auto] [overflow-wrap:anywhere]",
              key === "photos" && "border-b-2 border-accent text-accent-hover",
              !enabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon strokeWidth={1.4} className="size-[18px] shrink-0" />
            {label}
          </span>
        ))}
      </nav>

      <div className="px-3 py-4">
        <GalleryList collectionId={collection.id} galleries={galleries} activeGalleryId={activeGalleryId} />
      </div>
    </aside>
  );
}
