import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/constants/collection";
import { formatDate, formatNumber } from "@/lib/utils/format";
import type { CollectionListItem } from "@/types/collection";
import { CollectionActionsMenu } from "./collection-actions-menu";
import { CollectionCover } from "./collection-cover";
import { CollectionStatusBadge } from "./collection-status-badge";

/** Dense list view. Columns progressively hide on narrow screens. */
export function CollectionListTable({ collections }: { collections: CollectionListItem[] }) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border">
          <tr className="[&>th]:eyebrow [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
            <th scope="col">Coleção</th>
            <th scope="col" className="hidden lg:table-cell">
              Data do evento
            </th>
            <th scope="col" className="hidden sm:table-cell">
              Fotos
            </th>
            <th scope="col" className="hidden xl:table-cell">
              Expiração
            </th>
            <th scope="col" className="hidden md:table-cell">
              Status
            </th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {collections.map((collection) => (
            <tr key={collection.id} className="relative transition-colors hover:bg-background/70">
              <td className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <CollectionCover
                    title={collection.title}
                    coverUrl={collection.coverUrl}
                    coverColor={collection.coverColor}
                    sizes="thumb"
                    className="h-12 w-16 shrink-0 rounded-[4px]"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/collections/${collection.id}`}
                      className="block truncate font-serif text-[17px] font-medium leading-tight after:absolute after:inset-0 after:content-['']"
                    >
                      {collection.title}
                    </Link>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {collection.clientName ?? "Sem cliente"} · {CATEGORY_LABELS[collection.category]}
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground tabular-nums lg:table-cell">{formatDate(collection.eventDate)}</td>
              <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{formatNumber(collection.photoCount)}</td>
              <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                {collection.expiresAt ? formatDate(collection.expiresAt) : "Nunca expira"}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <CollectionStatusBadge status={collection.status} expiresAt={collection.expiresAt} />
              </td>
              <td className="relative z-10 w-12 px-2 py-3 text-right">
                <CollectionActionsMenu collection={collection} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
