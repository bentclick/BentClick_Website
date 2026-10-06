"use client";

import { useState } from "react";
import { setPasswordAction, updateAccessAction } from "@/actions/collection-settings.actions";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { SettingsCard, useSave } from "./settings-card";

export function AccessCard({ collection }: { collection: CollectionSettingsView }) {
  const [access, setAccess] = useState({ isPrivate: collection.isPrivate, requireClientIdentity: collection.requireClientIdentity });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const accessSave = useSave();
  const passwordSave = useSave();

  return (
    <SettingsCard
      id="acesso"
      title="Acesso"
      description="Quem pode abrir a galeria e o que pedimos antes."
      pending={accessSave.pending}
      onSave={() => accessSave.save(() => updateAccessAction({ collectionId: collection.id, ...access }), "Acesso atualizado")}
    >
      <div>
        <SwitchField
          id="set-private"
          label="Galeria privada"
          description="Acesso apenas por link, nunca listada no site público."
          checked={access.isPrivate}
          onChange={(e) => setAccess((a) => ({ ...a, isPrivate: e.target.checked }))}
        />
        <SwitchField
          id="set-identity"
          label="Pedir nome e e-mail do cliente"
          description="Antes de enviar a seleção de favoritos."
          checked={access.requireClientIdentity}
          onChange={(e) => setAccess((a) => ({ ...a, requireClientIdentity: e.target.checked }))}
        />
      </div>

      <div className="grid gap-2 rounded-[6px] border border-border bg-background/60 p-4">
        <Label htmlFor="set-password">Senha / PIN</Label>
        <p className="text-[12.5px] text-muted-foreground">
          {collection.hasPassword ? "A galeria está protegida por senha." : "Sem senha: qualquer pessoa com o link abre a galeria."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            id="set-password"
            className="max-w-56"
            value={password}
            autoComplete="off"
            spellCheck={false}
            placeholder={collection.hasPassword ? "Nova senha" : "Definir senha"}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(undefined);
            }}
            aria-invalid={!!passwordError}
          />
          <Button
            variant="outline"
            disabled={passwordSave.pending || password.trim().length === 0}
            onClick={() =>
              passwordSave.save(
                () => setPasswordAction({ collectionId: collection.id, password }),
                collection.hasPassword ? "Senha alterada" : "Senha definida",
                () => setPassword(""),
                (e) => setPasswordError(e.password?.[0]),
              )
            }
          >
            {collection.hasPassword ? "Alterar senha" : "Definir senha"}
          </Button>
          {collection.hasPassword ? (
            <Button
              variant="ghost"
              className="text-danger hover:text-danger"
              disabled={passwordSave.pending}
              onClick={() => passwordSave.save(() => setPasswordAction({ collectionId: collection.id, password: null }), "Senha removida")}
            >
              Remover senha
            </Button>
          ) : null}
        </div>
        <FieldError message={passwordError} />
        <FieldHint>Ao trocar a senha, todos precisam digitar a nova — os favoritos dos clientes são mantidos.</FieldHint>
      </div>
    </SettingsCard>
  );
}
