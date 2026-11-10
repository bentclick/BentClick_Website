"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { photoOfExport } from "@/lib/develop/develop-batch";
import { createEditUploadQueue, type UploadCounts } from "@/lib/develop/edit-upload-queue";
import { APPLY_EDIT_COMMAND, exportedFileSpec, parseEditorMessage, SELECT_ALL_COMMAND } from "@/lib/develop/lightcraft-messages";
import { uploadEditedVersion } from "@/lib/uploads/edit-api";
import { UploadApiError } from "@/lib/uploads/upload-api";
import type { DevelopSession } from "@/services/photos/photo-develop.service";

export type EditorPhase = "starting" | "loading" | "editing" | "failed";
export type LoadProgress = { done: number; failed: number; total: number };

type Response = { ok: boolean; value: string };
type Command = { type: "lightcraft:cmd"; id: string; params: string };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Falha ao salvar");
// library.info says nothing we need; its answer means every message sent before it was handled
const BARRIER: Command = { type: "lightcraft:cmd", id: "library.info", params: "{}" };

/**
 * Bridge to the framed editor: hands it the session's originals one by one and turns each export into that photo's
 * edited version. Commands are answered in the order they're sent with no request id (docs/web.md), so the answers
 * are matched to a FIFO of waiting callers.
 */
export function useLightcraftEditor(frame: RefObject<HTMLIFrameElement | null>, session: DevelopSession) {
  const [phase, setPhase] = useState<EditorPhase>("starting");
  const [failure, setFailure] = useState<string | null>(null);
  const [load, setLoad] = useState<LoadProgress>({ done: 0, failed: 0, total: session.photos.length });
  const [uploads, setUploads] = useState<UploadCounts>({ pending: 0, saved: 0, failed: 0 });
  const [exporting, setExporting] = useState(false);
  const waiting = useRef<((r: Response) => void)[]>([]);
  const opened = useRef(false);

  const send = useCallback(
    (command: Command) =>
      new Promise<Response>((resolve) => {
        waiting.current.push(resolve);
        frame.current?.contentWindow?.postMessage(command, window.location.origin);
      }),
    [frame],
  );

  useEffect(() => {
    const queue = createEditUploadQueue({
      onChange: setUploads,
      onFailure: (label, error) => toast.error(`${label}: ${messageOf(error)}`),
      isRateLimited: (error) => error instanceof UploadApiError && error.status === 429,
    });

    async function openPhotos() {
      if (opened.current) return;
      opened.current = true;
      setPhase("loading");
      let failed = 0;
      for (const [i, photo] of session.photos.entries()) {
        try {
          const res = await fetch(photo.sourceUrl);
          if (!res.ok) throw new Error(String(res.status));
          const bytes = await res.arrayBuffer();
          frame.current?.contentWindow?.postMessage({ type: "lightcraft:open", name: photo.openName, bytes }, window.location.origin, [bytes]);
          await send(BARRIER); // one original in memory at a time, not the whole album
        } catch {
          failed++;
        }
        setLoad({ done: i + 1, failed, total: session.photos.length });
      }
      if (failed === session.photos.length) {
        setFailure("Não foi possível carregar os arquivos originais. Recarregue a página.");
        setPhase("failed");
        return;
      }
      if (failed > 0) toast.error(`${failed} ${failed === 1 ? "foto não pôde ser carregada" : "fotos não puderam ser carregadas"}.`);
      setPhase("editing");
    }

    function save(name: string, bytes: ArrayBuffer) {
      const photo = photoOfExport(session.photos, name);
      if (!photo) return void toast.error(`${name} não é uma foto deste álbum; não foi salva.`);
      const spec = exportedFileSpec(photo.filename, name);
      if (!spec) return void toast.error("Exporte em JPG, PNG ou WebP para salvar na foto.");
      void queue.add({ label: photo.filename, run: () => uploadEditedVersion(photo.photoId, new File([bytes], spec.name, { type: spec.type })) });
    }

    function onMessage(event: MessageEvent) {
      // The frame shares our origin, so both checks are needed: other windows of the site must not drive this.
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = parseEditorMessage(event.data);
      if (message?.type === "ready") void openPhotos();
      else if (message?.type === "failed") {
        setFailure("O editor não conseguiu iniciar neste navegador.");
        setPhase("failed");
      } else if (message?.type === "save") save(message.name, message.bytes);
      else if (message?.type === "response") waiting.current.shift()?.({ ok: message.ok, value: message.value });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frame, session, send]);

  /** Exports the editor's selection (or, with `all`, every photo); the files come back as `lightcraft:save`. */
  const exportPhotos = useCallback(
    async (all: boolean) => {
      setExporting(true);
      try {
        const selected = all ? await send(SELECT_ALL_COMMAND) : { ok: true, value: "" };
        // the editor's own text, in English
        const result = selected.ok ? await send(APPLY_EDIT_COMMAND) : selected;
        if (!result.ok) toast.error(`O editor não conseguiu gerar as imagens: ${result.value}`);
      } finally {
        setExporting(false);
      }
    },
    [send],
  );

  // Adjustments live only in the frame, and queued uploads only in this tab: leaving loses both.
  const atRisk = phase === "editing" || phase === "loading" || uploads.pending > 0;
  useEffect(() => {
    if (!atRisk) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [atRisk]);

  return { phase, failure, load, uploads, exporting, exportPhotos };
}
