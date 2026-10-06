"use client";

import { ImagePlus, Loader2, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePortfolioImagesAction, setAlbumCoverAction } from "@/actions/portfolio.actions";
import { Dropzone } from "@/components/photos/dropzone";
import { UploadDialog } from "@/components/photos/upload-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { portfolioUploadAdapter } from "@/lib/uploads/upload-api";
import { pluralize } from "@/lib/utils/format";
import type { PortfolioImageItem } from "@/types/portfolio";

type Props = { albumId: string; albumTitle: string; images: PortfolioImageItem[] };

export function AlbumImages({ albumId, albumTitle, images }: Props) {
  const router = useRouter();
  const adapter = useMemo(() => portfolioUploadAdapter(albumId), [albumId]);
  const { queue, items } = useUploadQueue(adapter);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const stuck = images.filter((i) => i.status === "UPLOADED").map((i) => i.id);
    if (stuck.length) queue.resumeProcessing(stuck);
  }, [images, queue]);

  function addFiles(files: File[]) {
    if (!files.length) return;
    queue.add(files);
    setDialogOpen(true);
  }

  function act(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) return void toast.error(r.error);
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-[26px] font-medium leading-none">Fotos</h2>
          <p className="mt-2 text-[12.5px] text-muted-foreground">{pluralize(images.length, "foto")} · a foto com ★ é a capa</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <ImagePlus /> Adicionar fotos
        </Button>
      </header>

      {images.length === 0 ? (
        <Dropzone onFiles={addFiles} className="mt-6 min-h-[260px] bg-surface/50" />
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {images.map((img) => (
            <li key={img.id}>
              <figure className="group relative aspect-square overflow-hidden rounded-[4px] bg-subtle" style={img.color ? { backgroundColor: `${img.color}22` } : undefined}>
                {img.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                  <img src={img.thumbnailUrl} alt={img.filename} loading="lazy" className="size-full object-contain" />
                ) : (
                  <div className="grid size-full place-items-center text-[11px] text-muted-foreground">
                    {img.status === "FAILED" ? "Falhou" : <Loader2 className="size-4 animate-spin" />}
                  </div>
                )}
                {img.isCover ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[3px] bg-accent px-1.5 py-0.5 text-[10.5px] font-medium text-white">
                    <Star className="size-3 fill-current" /> Capa
                  </span>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Ações de ${img.filename}`}
                    className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-[4px] bg-black/35 text-white opacity-0 hover:bg-black/55 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-44">
                    <DropdownMenuItem disabled={img.status !== "READY" || img.isCover || pending} onSelect={() => act(() => setAlbumCoverAction(img.id), "Capa do álbum atualizada")}>
                      <Star /> {img.isCover ? "Capa atual" : "Definir como capa"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive disabled={pending} onSelect={() => act(() => deletePortfolioImagesAction([img.id]), "Foto excluída")}>
                      <Trash2 /> Excluir foto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </figure>
            </li>
          ))}
        </ul>
      )}

      <UploadDialog open={dialogOpen} onOpenChange={setDialogOpen} destinationLabel={`o álbum “${albumTitle}”`} queue={queue} items={items} />
    </section>
  );
}
