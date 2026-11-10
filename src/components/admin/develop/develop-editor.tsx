"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { type EditorStorage, useEditorStorage } from "@/hooks/use-editor-storage";
import { type EditorPhase, useLightcraftEditor } from "@/hooks/use-lightcraft-editor";
import { LIGHTCRAFT_BASE } from "@/lib/security/csp";
import type { DevelopSession } from "@/services/photos/photo-develop.service";

const DESKTOP = "(min-width: 1024px) and (pointer: fine)";

const subscribe = (notify: () => void) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

const STATUS: Record<EditorPhase, string> = {
  starting: "Abrindo o editor…",
  "loading-photo": "Carregando o arquivo original…",
  editing: "Os ajustes não ficam salvos: só a imagem aplicada à foto.",
  exporting: "Gerando a imagem em tamanho cheio…",
  saving: "Aplicando a versão editada…",
  saved: "Versão editada aplicada. Aplique de novo para substituir.",
  failed: "",
};

function EditorFrame({ session }: { session: DevelopSession }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const { phase, failure, apply } = useLightcraftEditor(frame, session);
  const busy = phase === "starting" || phase === "loading-photo" || phase === "exporting" || phase === "saving";
  const canApply = phase === "editing" || phase === "saved";

  return (
    <>
      <p role="status" className={phase === "failed" ? "ml-auto text-[12.5px] text-danger" : "ml-auto flex items-center gap-2 text-[12.5px] text-white/70"}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {failure ?? STATUS[phase]}
      </p>
      <Button size="sm" onClick={apply} disabled={!canApply}>
        Aplicar à foto
      </Button>
      {/* store=idb: the library goes where useEditorStorage wipes it (store=memory can't develop a RAW, see editor-storage). */}
      <iframe ref={frame} src={`${LIGHTCRAFT_BASE}/index.html?host=parent&store=idb`} title={`Editor de ${session.filename}`} allow="fullscreen; clipboard-read; clipboard-write" className="absolute inset-x-0 bottom-0 top-12 size-full h-[calc(100%-3rem)] border-0" />
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
        <span className="truncate text-[13px]">{session.filename}</span>
        {isDesktop ? <DesktopEditor session={session} /> : null}
      </header>
      {isDesktop ? null : <p className="p-6 text-[14px] text-white/80">A revelação funciona em um computador, com Chrome ou Edge.</p>}
    </div>
  );
}
