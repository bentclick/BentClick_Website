"use client";

import { Loader2, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePhotosAction, setCoverPhotoAction } from "@/actions/photo.actions";
import { Dropzone } from "@/components/photos/dropzone";
import { PhotoTile } from "@/components/photos/photo-tile";
import { UploadDialog } from "@/components/photos/upload-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useEditedVersions } from "@/hooks/use-edited-versions";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { collectionUploadAdapter } from "@/lib/uploads/upload-api";
import { cn } from "@/lib/utils/cn";
import type { EditorPhoto } from "@/types/photo";
import { viewablePhotos } from "@/lib/images/viewer-photos";
import { MAX_DEVELOP_BATCH } from "@/lib/develop/develop-batch";
import { PhotoViewer } from "./photo-viewer";
import { type GridSize, PhotoToolbar } from "./photo-toolbar";

const GRID: Record<GridSize, string> = {
  s: "grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8",
  m: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6",
  l: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
};

type Props = {
  collectionId: string;
  gallery: { id: string; name: string; photoCount: number };
  photos: EditorPhoto[];
  coverPhotoId: string | null;
};

/** Orchestrates the gallery grid, uploads and photo actions; business rules live server-side. */
export function EditorPhotos({ collectionId, gallery, photos, coverPhotoId }: Props) {
  const router = useRouter();
  const adapter = useMemo(() => collectionUploadAdapter({ collectionId, galleryId: gallery.id }), [collectionId, gallery.id]);
  const { queue, items } = useUploadQueue(adapter);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gridSize, setGridSize] = useState<GridSize>("m");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const edited = useEditedVersions(photos);
  const editedInput = useRef<HTMLInputElement>(null);
  const editedTarget = useRef<string | null>(null); // null = batch matched by filename
  const [confirmRevert, setConfirmRevert] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const viewable = useMemo(() => viewablePhotos(photos), [photos]);
  const canView = useMemo(() => new Set(viewable.map((p) => p.id)), [viewable]);
  const developBase = `/dashboard/revelar/colecao/${collectionId}`;
  const hasReady = photos.some((p) => p.status === "READY");
  const readySelected = photos.filter((p) => selected.has(p.id) && p.status === "READY").map((p) => p.id);

  // Photos left mid-pipeline by a closed tab get their previews generated now.
  useEffect(() => {
    const stuck = photos.filter((p) => p.status === "UPLOADED").map((p) => p.id);
    if (stuck.length) queue.resumeProcessing(stuck);
  }, [photos, queue]);

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      queue.add(files);
      setDialogOpen(true);
    },
    [queue],
  );

  const active = items.filter((i) => i.status !== "done" && i.status !== "failed").length;
  const done = items.filter((i) => i.status === "done").length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setCover(id: string) {
    startTransition(async () => {
      const r = await setCoverPhotoAction(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Capa atualizada");
      router.refresh();
    });
  }

  function remove(ids: string[]) {
    startTransition(async () => {
      const r = await deletePhotosAction(ids);
      setConfirmDelete(null);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.data.deleted === 1 ? "Foto excluída" : `${r.data.deleted} fotos excluídas`);
      setSelected(new Set());
      setSelecting(false);
      router.refresh();
    });
  }

  function pickEdited(photoId: string | null) {
    editedTarget.current = photoId;
    if (editedInput.current) {
      editedInput.current.multiple = photoId === null;
      editedInput.current.click();
    }
  }

  function onEditedChosen(files: File[]) {
    const [first] = files;
    if (!first) return;
    if (editedTarget.current) void edited.sendForPhoto(editedTarget.current, first);
    else void edited.sendBatch(files);
  }

  return (
    <div
      className="relative min-h-[60vh]"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <PhotoToolbar
        galleryName={gallery.name}
        photoCount={photos.length}
        gridSize={gridSize}
        onGridSize={setGridSize}
        selecting={selecting}
        onToggleSelecting={() => {
          setSelecting((s) => !s);
          setSelected(new Set());
        }}
        onAddMedia={() => setDialogOpen(true)}
        onSendEdited={() => pickEdited(null)}
        editedProgress={edited.progress}
        developHref={hasReady ? `${developBase}?galeria=${gallery.id}` : null}
      />

      <input
        ref={editedInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          onEditedChosen(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {photos.length === 0 ? (
        <div className="mt-8">
          <Dropzone onFiles={addFiles} className="min-h-[340px] bg-surface/50" />
        </div>
      ) : (
        <ul className={cn("mt-8 grid gap-2", GRID[gridSize])}>
          {photos.map((photo) => (
            <li key={photo.id}>
              <PhotoTile
                photo={photo}
                isCover={photo.id === coverPhotoId}
                selecting={selecting}
                selected={selected.has(photo.id)}
                onToggleSelect={() => toggle(photo.id)}
                onSetCover={() => setCover(photo.id)}
                onDelete={() => setConfirmDelete([photo.id])}
                onRetry={() => queue.resumeProcessing([photo.id], true)}
                onReplaceEdited={() => pickEdited(photo.id)}
                onRevertEdited={() => setConfirmRevert(photo.id)}
                onOpen={canView.has(photo.id) ? () => setViewing(photo.id) : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-[6px] border-2 border-dashed border-accent bg-accent-soft/80 backdrop-blur-[1px]">
          <p className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.16em] text-accent-hover">
            <Upload className="size-4" /> Solte para enviar a “{gallery.name}”
          </p>
        </div>
      ) : null}

      {selecting && selected.size > 0 ? (
        <div className="sticky bottom-4 z-20 mx-auto mt-6 flex w-fit items-center gap-3 rounded-[6px] border border-border bg-surface px-4 py-2.5 shadow-[0_12px_32px_-14px_rgba(17,17,17,0.35)]">
          <span className="text-[13px] tabular-nums">
            {selected.size} {selected.size === 1 ? "selecionada" : "selecionadas"}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(photos.map((p) => p.id)))}>
            Selecionar todas
          </Button>
          {readySelected.length > 0 && readySelected.length <= MAX_DEVELOP_BATCH ? (
            <Button size="sm" variant="ghost" asChild className="max-lg:hidden">
              <Link href={`${developBase}?fotos=${readySelected.join(",")}`}>
                <SlidersHorizontal /> Revelar
              </Link>
            </Button>
          ) : null}
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete([...selected])}>
            <Trash2 /> Excluir
          </Button>
        </div>
      ) : null}

      {!dialogOpen && items.length > 0 ? (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex h-11 items-center gap-2.5 rounded-full bg-foreground px-4 text-[12.5px] text-white shadow-[0_12px_32px_-12px_rgba(17,17,17,0.5)]"
        >
          {active > 0 ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {active > 0 ? `Enviando ${done}/${items.length}` : `${done} enviadas · ver detalhes`}
        </button>
      ) : null}

      <UploadDialog open={dialogOpen} onOpenChange={setDialogOpen} destinationLabel={`a galeria “${gallery.name}”`} queue={queue} items={items} />

      <Dialog open={confirmRevert !== null} onOpenChange={(o) => !o && setConfirmRevert(null)}>
        <DialogContent>
          <DialogTitle>Voltar ao original?</DialogTitle>
          <DialogDescription>A versão editada é apagada e o cliente volta a ver a foto original. O arquivo original continua intacto.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmRevert(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (confirmRevert) void edited.revert(confirmRevert);
                setConfirmRevert(null);
              }}
            >
              Voltar ao original
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogTitle>{confirmDelete && confirmDelete.length > 1 ? `Excluir ${confirmDelete.length} fotos?` : "Excluir esta foto?"}</DialogTitle>
          <DialogDescription>O arquivo original e as pré-visualizações são apagados do armazenamento. Isso não pode ser desfeito.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => confirmDelete && remove(confirmDelete)}>
              {pending ? <Loader2 className="animate-spin" /> : null} Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewing ? <PhotoViewer photos={viewable} startId={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
