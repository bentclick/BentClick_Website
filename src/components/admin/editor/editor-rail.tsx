import { Images, Palette, Plus, Settings2, Share2 } from "lucide-react";
import Link from "next/link";
import { CollectionCover } from "@/components/admin/collections/collection-cover";
import { cn } from "@/lib/utils/cn";

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
  const base = `/dashboard/collections/${collection.id}`;

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
          <p className="mt-2.5 text-[12px] text-muted-foreground">Defina a capa a partir de qualquer foto enviada.</p>
        ) : null}
      </div>

      <nav aria-label="Seções da coleção" className="flex border-y border-border lg:border-t lg:border-b">
        {TABS.map(({ key, label, icon: Icon, enabled }) => (
          <span
            key={key}
            title={enabled ? label : `${label} — em breve`}
            aria-current={key === "photos" ? "page" : undefined}
            aria-disabled={!enabled || undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-[10.5px] text-muted-foreground",
              key === "photos" && "border-b-2 border-accent text-accent-hover",
              !enabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon strokeWidth={1.4} className="size-[18px]" />
            {label}
          </span>
        ))}
      </nav>

      <div className="px-3 py-4">
        <ul className="grid gap-0.5">
          {galleries.map((gallery) => {
            const active = gallery.id === activeGalleryId;
            return (
              <li key={gallery.id}>
                <Link
                  href={`${base}?gallery=${gallery.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center justify-between rounded-[5px] px-3 text-[13px] transition-colors hover:bg-subtle",
                    active && "bg-accent-soft font-medium text-accent-hover hover:bg-accent-soft",
                  )}
                >
                  <span className="truncate">{gallery.name}</span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">({gallery.photoCount})</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled
          title="Gerenciamento de galerias chega na próxima fase"
          className="mt-2 inline-flex h-9 w-full items-center gap-2 rounded-[5px] px-3 text-[13px] text-accent transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" /> Adicionar galeria
        </button>
      </div>
    </aside>
  );
}
