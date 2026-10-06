"use client";

import { useState } from "react";
import { updateExpiryAction } from "@/actions/collection-settings.actions";
import { FieldError, FieldHint, Input, Label, Select } from "@/components/ui/field";
import { EXPIRY_PRESETS, EXPIRY_PRESET_LABELS } from "@/lib/constants/collection";
import { formatLongDate } from "@/lib/utils/format";
import { daysUntil } from "@/services/collections/collection-rules";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { SettingsCard, useSave } from "./settings-card";

function currentLabel(expiresAt: string | null) {
  if (!expiresAt) return "Esta galeria não expira.";
  const days = daysUntil(new Date(expiresAt));
  if (days !== null && days <= 0) return `Expirou em ${formatLongDate(expiresAt)}.`;
  return `Expira em ${formatLongDate(expiresAt)}${days !== null ? ` (${days} ${days === 1 ? "dia" : "dias"})` : ""}.`;
}

export function ExpiryCard({ collection }: { collection: CollectionSettingsView }) {
  const [preset, setPreset] = useState<"keep" | (typeof EXPIRY_PRESETS)[number]>("keep");
  const [customDate, setCustomDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const { pending, save } = useSave();
  const expired = collection.status === "EXPIRED";

  return (
    <SettingsCard
      id="expiracao"
      title="Expiração"
      description="Depois do prazo o cliente vê um aviso. Os originais continuam guardados."
      pending={pending}
      saveLabel={expired && preset !== "keep" ? "Reativar galeria" : "Salvar"}
      onSave={() =>
        save(
          () => updateExpiryAction({ collectionId: collection.id, preset, customDate }),
          expired && preset !== "keep" ? "Galeria reativada" : "Expiração atualizada",
          () => {
            setPreset("keep");
            setErrors({});
          },
          setErrors,
        )
      }
    >
      <p className={expired ? "rounded-[5px] bg-warning-soft px-3 py-2 text-[13px] text-warning" : "text-[13px]"}>{currentLabel(collection.expiresAt)}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="set-expiry">Nova expiração</Label>
          <Select id="set-expiry" value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)}>
            <option value="keep">Manter como está</option>
            {EXPIRY_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p === "never" || p === "custom" ? EXPIRY_PRESET_LABELS[p] : `${EXPIRY_PRESET_LABELS[p]} a partir de hoje`}
              </option>
            ))}
          </Select>
        </div>
        {preset === "custom" ? (
          <div className="grid gap-2">
            <Label htmlFor="set-expiry-date">Expira em</Label>
            <Input
              id="set-expiry-date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              aria-invalid={!!errors.customDate}
            />
            <FieldError message={errors.customDate?.[0]} />
          </div>
        ) : null}
      </div>
      {expired ? <FieldHint>Escolha uma nova data (ou “Nunca expira”) para liberar o acesso de novo.</FieldHint> : null}
    </SettingsCard>
  );
}
