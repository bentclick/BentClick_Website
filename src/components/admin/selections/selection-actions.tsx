"use client";

import { ClipboardCopy, Download, FileDown, Loader2, LockOpen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearSelectionAction, reopenSelectionAction } from "@/actions/selection.actions";
import { ArchiveDialog } from "@/components/downloads/archive-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Props = { sessionId: string; collectionId: string; count: number; clientLabel: string; backHref: string; submitted: boolean };

export function SelectionActions({ sessionId, collectionId, count, clientLabel, backHref, submitted }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [zipOpen, setZipOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const exportUrl = `/api/selections/${sessionId}/export`;

  async function copyNames() {
    try {
      const text = await fetch(exportUrl).then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      });
      await navigator.clipboard.writeText(text);
      toast.success("Nomes copiados", { description: "Cole no filtro do Lightroom para encontrar os arquivos." });
    } catch {
      toast.error("Não foi possível copiar os nomes");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setZipOpen(true)} disabled={count === 0}>
        <Download /> Baixar fotos (ZIP)
      </Button>
      <Button variant="outline" size="sm" onClick={() => void copyNames()}>
        <ClipboardCopy /> Copiar nomes
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={exportUrl} download>
          <FileDown /> Exportar nomes (.txt)
        </a>
      </Button>
      {submitted ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          title="A seleção enviada fica fechada. Reabra para o cliente poder mudar."
          onClick={() =>
            startTransition(async () => {
              const r = await reopenSelectionAction(sessionId);
              if (!r.ok) return void toast.error(r.error);
              toast.success("Seleção reaberta", { description: `${clientLabel} já pode mudar as fotos e enviar de novo.` });
              router.refresh();
            })
          }
        >
          <LockOpen /> Reabrir seleção
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setConfirm(true)}>
        <Trash2 /> Limpar seleção
      </Button>

      <ArchiveDialog
        open={zipOpen}
        onOpenChange={setZipOpen}
        title="Baixar seleção"
        description={`Originais das fotos escolhidas por ${clientLabel}.`}
        options={[{ value: "selection", label: "Fotos selecionadas", count }]}
        createRequest={() => ({ url: `/api/collections/${collectionId}/archives`, body: { scope: "selection", sessionId } })}
        statusUrl={(id) => `/api/archives/${id}`}
        partUrl={(id, index) => `/api/archives/${id}/parts/${index}`}
      />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Limpar a seleção de {clientLabel}?</DialogTitle>
          <DialogDescription>Os favoritos desta pessoa são removidos. As fotos continuam na galeria.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await clearSelectionAction(sessionId);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success("Seleção limpa");
                  setConfirm(false);
                  router.push(backHref);
                  router.refresh();
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : null} Limpar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
