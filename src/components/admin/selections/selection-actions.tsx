"use client";

import { ClipboardCopy, FileDown, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearSelectionAction } from "@/actions/selection.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Props = { sessionId: string; clientLabel: string; backHref: string };

export function SelectionActions({ sessionId, clientLabel, backHref }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
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
      <Button variant="outline" size="sm" onClick={() => void copyNames()}>
        <ClipboardCopy /> Copiar nomes
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={exportUrl} download>
          <FileDown /> Exportar nomes (.txt)
        </a>
      </Button>
      <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setConfirm(true)}>
        <Trash2 /> Limpar seleção
      </Button>

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
