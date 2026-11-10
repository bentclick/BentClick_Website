"use client";

import { useState } from "react";
import { updateAccessAction } from "@/actions/collection-settings.actions";
import { SwitchField } from "@/components/ui/switch-field";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { PasswordPanel } from "./password-panel";
import { SettingsCard, useSave } from "./settings-card";

export function AccessCard({ collection }: { collection: CollectionSettingsView }) {
  const [access, setAccess] = useState({ isPrivate: collection.isPrivate, requireClientIdentity: collection.requireClientIdentity });
  const accessSave = useSave();

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
          description="Antes de favoritar ou baixar fotos."
          checked={access.requireClientIdentity}
          onChange={(e) => setAccess((a) => ({ ...a, requireClientIdentity: e.target.checked }))}
        />
      </div>

      <PasswordPanel collection={collection} />
    </SettingsCard>
  );
}
