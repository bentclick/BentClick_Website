"use client";

import { Check, Loader2, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGalleryAction, deleteGalleryAction, renameGalleryAction } from "@/actions/gallery.actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

type Gallery = { id: string; name: string; photoCount: number };
type Props = { collectionId: string; galleries: Gallery[] };

function NameInput({ initial, onSubmit, onCancel, pending }: { initial: string; onSubmit: (name: string) => void; onCancel: () => void; pending: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className="flex items-center gap-1 px-1"
    >
      <input
        autoFocus
        value={value}
        maxLength={60}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        aria-label="Nome da galeria"
        placeholder="Ex.: Cerimônia"
        className="h-9 min-w-0 flex-1 rounded-[5px] border border-accent bg-surface px-2.5 text-[13px] focus-visible:outline-none"
      />
      <button type="submit" disabled={pending} aria-label="Salvar" className="grid size-8 place-items-center rounded-[5px] text-accent hover:bg-subtle">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancelar" className="grid size-8 place-items-center rounded-[5px] text-muted-foreground hover:bg-subtle">
        <X className="size-4" />
      </button>
    </form>
  );
}

export function GalleryList({ collectionId, galleries }: Props) {
  const router = useRouter();
  const requested = useSearchParams().get("gallery");
  const activeGalleryId = galleries.some((g) => g.id === requested) ? requested : (galleries[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const base = `/dashboard/collections/${collectionId}`;

  function create(name: string) {
    startTransition(async () => {
      const r = await createGalleryAction({ collectionId, name });
      if (!r.ok) return void toast.error(r.error);
      setAdding(false);
      router.push(`${base}?gallery=${r.data.id}`);
      router.refresh();
    });
  }

  function rename(galleryId: string, name: string) {
    startTransition(async () => {
      const r = await renameGalleryAction({ galleryId, name });
      if (!r.ok) return void toast.error(r.error);
      setRenaming(null);
      router.refresh();
    });
  }

  function remove(gallery: Gallery) {
    startTransition(async () => {
      const r = await deleteGalleryAction(gallery.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Galeria “${gallery.name}” excluída`);
      router.push(base);
      router.refresh();
    });
  }

  return (
    <div>
      <ul className="grid gap-0.5">
        {galleries.map((gallery) => {
          const active = gallery.id === activeGalleryId;
          if (renaming === gallery.id) {
            return (
              <li key={gallery.id}>
                <NameInput initial={gallery.name} pending={pending} onSubmit={(n) => rename(gallery.id, n)} onCancel={() => setRenaming(null)} />
              </li>
            );
          }
          return (
            <li key={gallery.id} className="group relative">
              <Link
                href={`${base}?gallery=${gallery.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center justify-between rounded-[5px] pl-3 pr-10 text-[13px] transition-colors hover:bg-subtle",
                  active && "bg-accent-soft font-medium text-accent-hover hover:bg-accent-soft",
                )}
              >
                <span className="truncate">{gallery.name}</span>
                <span className="text-[12px] tabular-nums text-muted-foreground">({gallery.photoCount})</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Opções da galeria ${gallery.name}`}
                  className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[4px] text-muted-foreground opacity-0 hover:bg-surface hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-40">
                  <DropdownMenuItem onSelect={() => setRenaming(gallery.id)}>
                    <Pencil /> Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive disabled={gallery.photoCount > 0 || galleries.length <= 1} onSelect={() => remove(gallery)}>
                    <Trash2 /> Excluir galeria
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="mt-2">
          <NameInput initial="" pending={pending} onSubmit={create} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 inline-flex h-9 w-full items-center gap-2 rounded-[5px] px-3 text-[13px] text-accent transition-colors hover:bg-subtle"
        >
          <Plus className="size-4" /> Adicionar galeria
        </button>
      )}
    </div>
  );
}
