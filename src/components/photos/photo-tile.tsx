"use client";

import { AlertCircle, Check, Download, ImageIcon, Loader2, MoreHorizontal, RotateCcw, Star, Trash2 } from "lucide-react";
import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import type { EditorPhoto } from "@/types/photo";

type Props = {
  photo: EditorPhoto;
  isCover: boolean;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSetCover: () => void;
  onDelete: () => void;
  onRetry: () => void;
};

export const PhotoTile = memo(function PhotoTile({ photo, isCover, selecting, selected, onToggleSelect, onSetCover, onDelete, onRetry }: Props) {
  const busy = photo.status === "UPLOADED" || photo.status === "PROCESSING";
  const failed = photo.status === "FAILED";

  return (
    <figure
      className={cn(
        "group relative aspect-square overflow-hidden rounded-[4px] bg-subtle",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
      )}
      style={photo.color ? { backgroundColor: `${photo.color}22` } : undefined}
    >
      {photo.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL; must not proxy through Vercel
        <img src={photo.thumbnailUrl} alt={photo.filename} loading="lazy" decoding="async" className="size-full object-contain" />
      ) : (
        <div className="grid size-full place-items-center p-3 text-center text-[11px] text-muted-foreground">
          {photo.isRaw ? (
            <span>
              <span className="block text-[13px] font-medium tracking-[0.2em] text-foreground">RAW</span>
              somente original
            </span>
          ) : busy ? (
            <span className="flex flex-col items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Gerando prévia
            </span>
          ) : failed ? (
            <span className="flex flex-col items-center gap-2 text-danger">
              <AlertCircle className="size-4" /> {photo.failureReason ?? "Falhou"}
            </span>
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>
      )}

      {isCover ? (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[3px] bg-accent px-1.5 py-0.5 text-[10.5px] font-medium text-white">
          <Star className="size-3 fill-current" /> Capa
        </span>
      ) : null}

      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-6 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {photo.filename}
      </figcaption>

      {selecting ? (
        <button
          type="button"
          onClick={onToggleSelect}
          aria-pressed={selected}
          aria-label={selected ? `Desmarcar ${photo.filename}` : `Selecionar ${photo.filename}`}
          className="absolute inset-0 flex items-start justify-end p-2"
        >
          <span className={cn("grid size-5 place-items-center rounded-full border-2 border-white bg-black/20 shadow", selected && "border-accent bg-accent")}>
            {selected ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
          </span>
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Ações de ${photo.filename}`}
            className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-[4px] bg-black/35 text-white opacity-0 transition-opacity duration-200 hover:bg-black/55 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-44">
            <DropdownMenuItem disabled={photo.status !== "READY" || isCover} onSelect={onSetCover}>
              <Star /> {isCover ? "Capa atual" : "Definir como capa"}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/api/photos/${photo.id}/download`}>
                <Download /> Baixar original
              </a>
            </DropdownMenuItem>
            {failed ? (
              <DropdownMenuItem onSelect={onRetry}>
                <RotateCcw /> Gerar prévia de novo
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onDelete}>
              <Trash2 /> Excluir foto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </figure>
  );
});
