"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { APPLY_EDIT_COMMAND, exportedFileSpec, isExportOf, parseEditorMessage } from "@/lib/develop/lightcraft-messages";
import { uploadEditedVersion } from "@/lib/uploads/edit-api";
import type { DevelopSession } from "@/services/photos/photo-develop.service";

export type EditorPhase = "starting" | "loading-photo" | "editing" | "exporting" | "saving" | "saved" | "failed";

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Falha ao salvar");

/** Bridge to the framed editor: hands it the RAW and turns each export into the photo's edited version. */
export function useLightcraftEditor(frame: RefObject<HTMLIFrameElement | null>, session: DevelopSession) {
  const [phase, setPhase] = useState<EditorPhase>("starting");
  const [failure, setFailure] = useState<string | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    function fail(message: string) {
      setFailure(message);
      setPhase("failed");
    }

    async function openPhoto() {
      if (opened.current) return;
      opened.current = true;
      setPhase("loading-photo");
      try {
        const res = await fetch(session.sourceUrl);
        if (!res.ok) throw new Error(String(res.status));
        const bytes = await res.arrayBuffer();
        frame.current?.contentWindow?.postMessage({ type: "lightcraft:open", name: session.filename, bytes }, window.location.origin, [bytes]);
        setPhase("editing");
      } catch {
        fail("Não foi possível carregar o arquivo original. Recarregue a página.");
      }
    }

    async function save(name: string, bytes: ArrayBuffer) {
      const spec = exportedFileSpec(session.filename, name);
      const refuse = (message: string) => {
        toast.error(message);
        setPhase((p) => (p === "exporting" ? "editing" : p));
      };
      if (!isExportOf(session.filename, name)) return refuse(`Essa imagem é de outra foto do editor. Selecione ${session.filename} e aplique de novo.`);
      if (!spec) return refuse("Exporte em JPG, PNG ou WebP para aplicar à foto.");
      setPhase("saving");
      try {
        await uploadEditedVersion(session.photoId, new File([bytes], spec.name, { type: spec.type }));
        toast.success("Versão editada aplicada à foto");
        setPhase("saved");
      } catch (error) {
        toast.error(messageOf(error));
        setPhase("editing");
      }
    }

    function onMessage(event: MessageEvent) {
      // The frame shares our origin, so both checks are needed: other windows of the site must not drive this.
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = parseEditorMessage(event.data);
      if (message?.type === "ready") void openPhoto();
      else if (message?.type === "failed") fail("O editor não conseguiu iniciar neste navegador.");
      else if (message?.type === "save") void save(message.name, message.bytes);
      else if (message?.type === "response" && !message.ok) {
        // only "Aplicar à foto" sends commands, so a refusal is about it (the text is the editor's, in English)
        toast.error(`O editor não conseguiu gerar a imagem: ${message.value}`);
        setPhase((p) => (p === "exporting" ? "editing" : p));
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frame, session]);

  /** Asks the frame for the full-size export; it comes back as `lightcraft:save`, handled above. */
  const apply = useCallback(() => {
    frame.current?.contentWindow?.postMessage(APPLY_EDIT_COMMAND, window.location.origin);
    setPhase("exporting");
  }, [frame]);

  // Adjustments live only in the frame, so leaving before an export loses them.
  const atRisk = phase === "editing" || phase === "exporting" || phase === "saving";
  useEffect(() => {
    if (!atRisk) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [atRisk]);

  return { phase, failure, apply };
}
