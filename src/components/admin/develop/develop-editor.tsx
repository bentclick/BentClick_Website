"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { type EditorStorage, useEditorStorage } from "@/hooks/use-editor-storage";
import { useLightcraftEditor } from "@/hooks/use-lightcraft-editor";
import { LIGHTCRAFT_BASE } from "@/lib/security/csp";
import type { DevelopSession } from "@/services/photos/photo-develop.service";

const DESKTOP = "(min-width: 1024px) and (pointer: fine)";

const subscribe = (notify: () => void) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One line for the header: what the editor is doing now, uploads first since leaving would lose them. */
function statusText({ phase, failure, load, uploads, exporting }: ReturnType<typeof useLightcraftEditor>): { text: string; busy: boolean } {
  if (phase === "failed") return { text: failure ?? "", busy: false };
  if (phase === "starting") return { text: "Abrindo o editor…", busy: true };
  if (phase === "loading") return { text: load.total === 1 ? "Carregando o arquivo original…" : `Carregando ${load.done + 1} de ${load.total}…`, busy: true };
  if (uploads.pending > 0) return { text: `Salvando… ${plural(uploads.pending, "foto na fila", "fotos na fila")}`, busy: true };
  if (exporting) return { text: "Gerando as imagens em tamanho cheio…", busy: true };
  if (uploads.saved > 0) return { text: `${plural(uploads.saved, "foto salva", "fotos salvas")}. Salve de novo para substituir.`, busy: false };
  return { text: "Os ajustes não ficam guardados: só as imagens salvas nas fotos.", busy: false };
}

function EditorFrame({ session }: { session: DevelopSession }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const editor = useLightcraftEditor(frame, session);
  const { text, busy } = statusText(editor);
  const canSave = editor.phase === "editing" && !editor.exporting;
  const batch = session.photos.length > 1;

  return (
    <>
      <p role="status" className={editor.phase === "failed" ? "ml-auto text-[12.5px] text-danger" : "ml-auto flex items-center gap-2 text-[12.5px] text-white/70"}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {text}
      </p>
      {batch ? (
        <Button
          size="sm"
          variant="outline"
          className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          onClick={() => void editor.exportPhotos(false)}
          disabled={!canSave}
          title="Salva só as fotos selecionadas na tira do editor"
        >
          Salvar selecionadas
        </Button>
      ) : null}
      <Button size="sm" onClick={() => void editor.exportPhotos(batch)} disabled={!canSave}>
        {batch ? `Salvar todas (${session.photos.length})` : "Aplicar à foto"}
      </Button>
      {/* store=idb: the library goes where useEditorStorage wipes it (store=memory can't develop a RAW, see editor-storage). */}
      <iframe ref={frame} src={`${LIGHTCRAFT_BASE}/index.html?host=parent&store=idb`} title={`Editor de ${session.title}`} allow="fullscreen; clipboard-read; clipboard-write" className="absolute inset-x-0 bottom-0 top-12 size-full h-[calc(100%-3rem)] border-0" />
    </>
  );
}

const STORAGE_STATUS: Record<Exclude<EditorStorage, "clear">, string> = {
  clearing: "Preparando o editor…",
  blocked: "O editor está aberto em outra aba. Feche-a para continuar.",
};

/** Mounts the editor only on an empty library in this browser (see useEditorStorage). */
function DesktopEditor({ session }: { session: DevelopSession }) {
  const storage = useEditorStorage();
  if (storage === "clear") return <EditorFrame session={session} />;
  return (
    <p role="status" className="ml-auto flex items-center gap-2 text-[12.5px] text-white/70">
      {storage === "clearing" ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {STORAGE_STATUS[storage]}
    </p>
  );
}

/** Full-screen editor. The 35 MB engine only loads on a computer, where it can actually run. */
export function DevelopEditor({ session }: { session: DevelopSession }) {
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);

  return (
    <div className="fixed inset-0 bg-[#1c1c1c]">
      <header className="flex h-12 items-center gap-4 px-4 text-white">
        <Link href={`/dashboard/collections/${session.collectionId}`} className="inline-flex items-center gap-2 text-[12.5px] text-white/80 hover:text-white">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <span className="truncate text-[13px]">
          {session.title}
          {session.photos.length > 1 ? <span className="text-white/50"> · {session.total > session.photos.length ? `${session.photos.length} de ${session.total} fotos` : `${session.photos.length} fotos`}</span> : null}
        </span>
        {isDesktop ? <DesktopEditor session={session} /> : null}
      </header>
      {isDesktop ? null : <p className="p-6 text-[14px] text-white/80">A revelação funciona em um computador, com Chrome ou Edge.</p>}
    </div>
  );
}
