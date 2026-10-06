"use client";

import {
  Archive,
  ArchiveRestore,
  CopyPlus,
  Eye,
  EyeOff,
  FolderOpen,
  Link2,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveCollectionAction,
  deleteCollectionAction,
  duplicateCollectionAction,
  publishCollectionAction,
  restoreCollectionAction,
  unpublishCollectionAction,
} from "@/actions/collection.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/utils/cn";
import { galleryUrl } from "@/lib/utils/urls";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { CollectionListItem } from "@/types/collection";

type Props = {
  collection: Pick<CollectionListItem, "id" | "title" | "slug" | "status">;
  triggerClassName?: string;
};

export function CollectionActionsMenu({ collection, triggerClassName }: Props) {
  const router = useRouter();
  const copy = useCopyToClipboard();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLive = collection.status === "PUBLISHED" || collection.status === "EXPIRED";
  const isArchived = collection.status === "ARCHIVED";

  function run<T>(action: () => Promise<ActionResult<T>>, success: string, onOk?: (data: T) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      onOk?.(result.data);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Ações de ${collection.title}`}
            className={cn("data-[state=open]:bg-subtle", triggerClassName)}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/collections/${collection.id}`}>
              <FolderOpen /> Abrir
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/g/${collection.slug}?preview=1`} target="_blank">
              <Eye /> Visualizar como cliente
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copy(galleryUrl(collection.slug), "Link copiado")}>
            <Link2 /> Copiar link do cliente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLive ? (
            <DropdownMenuItem onSelect={() => run(() => unpublishCollectionAction(collection.id), "Galeria movida para rascunhos")}>
              <EyeOff /> Despublicar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isArchived}
              onSelect={() => run(() => publishCollectionAction(collection.id), "Galeria publicada")}
            >
              <Send /> Publicar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => duplicateCollectionAction(collection.id),
                "Coleção duplicada",
                (copyResult) => router.push(`/dashboard/collections/${copyResult.id}`),
              )
            }
          >
            <CopyPlus /> Duplicar
          </DropdownMenuItem>
          {isArchived ? (
            <DropdownMenuItem onSelect={() => run(() => restoreCollectionAction(collection.id), "Coleção restaurada")}>
              <ArchiveRestore /> Restaurar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => run(() => archiveCollectionAction(collection.id), "Coleção arquivada")}>
              <Archive /> Arquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Excluir “{collection.title}”?</DialogTitle>
          <DialogDescription>
            O link do cliente deixa de funcionar na hora e isso não pode ser desfeito. Arquive se ainda puder precisar dela.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setConfirmDelete(false);
                run(() => deleteCollectionAction(collection.id), "Coleção excluída");
              }}
            >
              Excluir definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
