"use client";

import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { regenerateLinkAction, setLinkEnabledAction } from "@/actions/collection-settings.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SwitchField } from "@/components/ui/switch-field";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { galleryUrl } from "@/lib/utils/urls";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { SettingsCard, useSave } from "./settings-card";

export function LinkCard({ collection }: { collection: CollectionSettingsView }) {
  const copy = useCopyToClipboard();
  const [confirm, setConfirm] = useState(false);
  const { pending, save } = useSave();
  const url = galleryUrl(collection.slug);

  return (
    <SettingsCard id="link" title="Link da galeria" description="Endereço único e aleatório. Gere um novo se ele vazar.">
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[5px] border border-border bg-background px-3 py-2.5 text-[13px]">{url}</code>
        <Button variant="outline" size="icon" aria-label="Copiar link" onClick={() => copy(url, "Link copiado")}>
          <Copy />
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Abrir galeria">
          <a href={`${url}?preview=1`} target="_blank" rel="noreferrer">
            <ExternalLink />
          </a>
        </Button>
      </div>
      <SwitchField
        id="link-enabled"
        label="Link ativo"
        description="Desative para bloquear o acesso temporariamente, sem mudar o endereço."
        checked={collection.linkEnabled}
        disabled={pending}
        onChange={(e) => save(() => setLinkEnabledAction({ collectionId: collection.id, enabled: e.target.checked }), e.target.checked ? "Link ativado" : "Link desativado")}
      />
      <div>
        <Button variant="outline" onClick={() => setConfirm(true)}>
          <RefreshCw /> Gerar novo link
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Gerar um novo link?</DialogTitle>
          <DialogDescription>O link atual para de funcionar na hora e os clientes precisam receber o novo. Seleções em andamento ficam guardadas no seu painel.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                save(() => regenerateLinkAction(collection.id), "Novo link gerado", (data) => {
                  setConfirm(false);
                  void copy(galleryUrl(data.slug), "Novo link copiado");
                })
              }
            >
              Gerar novo link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  );
}
