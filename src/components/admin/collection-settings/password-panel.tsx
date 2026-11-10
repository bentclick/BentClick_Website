"use client";

import { Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { setPasswordAction } from "@/actions/collection-settings.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldHint, Label } from "@/components/ui/field";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { suggestGalleryPassword } from "@/lib/validation/gallery-password";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { useSave } from "./settings-card";

/** The gallery password: generated, never typed, and always readable here so it can be sent to the client. */
export function PasswordPanel({ collection }: { collection: CollectionSettingsView }) {
  const { pending, save } = useSave();
  const copy = useCopyToClipboard();
  const [confirmNew, setConfirmNew] = useState(false);
  const { hasPassword, password } = collection;

  const generate = (success: string) => save(() => setPasswordAction({ collectionId: collection.id, password: suggestGalleryPassword() }), success);

  return (
    <div className="grid gap-2 rounded-[6px] border border-border bg-background/60 p-4">
      <Label>Senha da galeria</Label>
      {!hasPassword ? (
        <>
          <p className="text-[12.5px] text-muted-foreground">Sem senha: qualquer pessoa com o link abre a galeria.</p>
          <div>
            <Button variant="outline" disabled={pending} onClick={() => generate("Senha criada")}>
              {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Proteger com senha
            </Button>
          </div>
        </>
      ) : (
        <>
          {password ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-[5px] border border-border bg-surface px-3 py-2 font-mono text-[14px] tracking-wide select-all">{password}</code>
              <Button variant="outline" size="icon" aria-label="Copiar senha" onClick={() => copy(password, "Senha copiada")}>
                <Copy />
              </Button>
            </div>
          ) : (
            <p className="text-[12.5px] text-muted-foreground">
              Esta senha foi criada antes de o site guardar uma cópia legível, por isso não dá para mostrá-la. Gere uma nova para poder copiá-la aqui.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => setConfirmNew(true)}>
              <RefreshCw /> Gerar nova senha
            </Button>
            <Button
              variant="ghost"
              className="text-danger hover:text-danger"
              disabled={pending}
              onClick={() => save(() => setPasswordAction({ collectionId: collection.id, password: null }), "Senha removida")}
            >
              Remover senha
            </Button>
          </div>
        </>
      )}
      <FieldHint>
        A senha é criada automaticamente. Após 20 tentativas erradas em 1 hora, a galeria bloqueia novas tentativas por até 1 hora. Ao trocar a senha, todos
        precisam digitar a nova; os favoritos dos clientes são mantidos.
      </FieldHint>

      <Dialog open={confirmNew} onOpenChange={setConfirmNew}>
        <DialogContent>
          <DialogTitle>Gerar uma nova senha?</DialogTitle>
          <DialogDescription>A senha atual deixa de funcionar. Quem já abriu a galeria vai precisar digitar a nova; os favoritos são mantidos.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmNew(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmNew(false);
                generate("Nova senha criada");
              }}
            >
              Gerar nova senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
