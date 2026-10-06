import Link from "next/link";
import { formatDate, pluralize } from "@/lib/utils/format";
import type { CollectionListItem } from "@/types/collection";
import { CollectionActionsMenu } from "./collection-actions-menu";
import { CollectionCover } from "./collection-cover";
import { CollectionStatusBadge } from "./collection-status-badge";

/** Image-first card: the cover carries the design, metadata stays quiet. */
export function CollectionCard({ collection }: { collection: CollectionListItem }) {
  const href = `/dashboard/collections/${collection.id}`;

  return (
    <article className="group relative overflow-hidden rounded-[6px] border border-border bg-surface transition-colors duration-200 hover:border-taupe">
      <CollectionCover
        title={collection.title}
        coverUrl={collection.coverUrl}
        coverColor={collection.coverColor}
        className="aspect-[4/3] [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.02]"
      />

      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate font-serif text-[19px] font-medium leading-tight">
            {/* Stretched link: the whole card opens the editor. */}
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {collection.title}
            </Link>
          </h2>
          <CollectionActionsMenu collection={collection} triggerClassName="relative z-10 -mr-2 -mt-1 size-7" />
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {collection.eventDate ? formatDate(collection.eventDate) : (collection.clientName ?? "Sem data do evento")}
        </p>
        <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">{pluralize(collection.photoCount, "foto")}</p>
        <CollectionStatusBadge status={collection.status} expiresAt={collection.expiresAt} className="mt-3" />
      </div>
    </article>
  );
}
