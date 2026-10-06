"use client";

import { ArrowLeft, Eye, Loader2, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { unpublishCollectionAction } from "@/actions/collection.actions";
import { CollectionActionsMenu } from "@/components/admin/collections/collection-actions-menu";
import { Button } from "@/components/ui/button";
import { PublishDialog, type PublishSummary } from "./publish-dialog";
import type { CollectionStatus } from "@/generated/prisma/enums";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { STATUS_LABELS } from "@/lib/constants/collection";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { galleryUrl } from "@/lib/utils/urls";

type Props = {
  collection: { id: string; title: string; slug: string; status: CollectionStatus; eventDate: string | null; photoCount: number };
  summary: PublishSummary;
};

export function EditorTopBar({ collection, summary }: Props) {
  const [publishOpen, setPublishOpen] = useState(false);
  const router = useRouter();
  const copy = useCopyToClipboard();
  const [pending, startTransition] = useTransition();
  const isLive = collection.status === "PUBLISHED";

  function togglePublish() {
    if (!isLive) {
      setPublishOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await unpublishCollectionAction(collection.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Galeria movida para rascunhos");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-3 sm:px-5">
      <Button asChild variant="ghost" size="icon" aria-label="Voltar para coleções">
        <Link href="/dashboard/collections">
          <ArrowLeft strokeWidth={1.5} />
        </Link>
      </Button>
      <div className="hidden h-8 w-px bg-border sm:block" />

      <div className="min-w-0 flex-1 sm:pl-1">
        <h1 className="truncate font-serif text-xl font-medium uppercase leading-tight tracking-[0.06em] sm:text-[22px]">
          {collection.title}
        </h1>
        <p className="flex items-center gap-2 truncate text-[12px] text-muted-foreground">
          {collection.eventDate ? <span>{formatDate(collection.eventDate)}</span> : null}
          {collection.eventDate ? <span aria-hidden>·</span> : null}
          <span
            className={cn(
              "text-[10.5px] font-medium uppercase tracking-[0.14em]",
              isLive ? "text-success" : collection.status === "EXPIRED" ? "text-warning" : "text-muted-foreground",
            )}
          >
            {STATUS_LABELS[collection.status]}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
          <Link href={`/g/${collection.slug}?preview=1`} target="_blank">
            <Eye strokeWidth={1.5} /> Visualizar
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex"
          onClick={() => copy(galleryUrl(collection.slug), "Link copiado")}
        >
          <Share2 strokeWidth={1.5} /> Compartilhar
        </Button>
        <CollectionActionsMenu collection={collection} />
        <Button size="sm" variant={isLive ? "outline" : "primary"} onClick={togglePublish} disabled={pending} className="ml-1">
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isLive ? "Despublicar" : "Publicar"}
        </Button>
      </div>
      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} collection={collection} summary={summary} />
    </header>
  );
}
