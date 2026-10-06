"use client";

import { useState } from "react";
import { updateDetailsAction } from "@/actions/collection-settings.actions";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { CATEGORY_OPTIONS } from "@/lib/constants/collection";
import type { ClientOption } from "@/types/client";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { SettingsCard, useSave } from "./settings-card";

export function DetailsCard({ collection, clients }: { collection: CollectionSettingsView; clients: ClientOption[] }) {
  const [form, setForm] = useState({
    title: collection.title,
    description: collection.description,
    eventDate: collection.eventDate,
    category: collection.category,
    clientId: collection.clientId,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const { pending, save } = useSave();
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <SettingsCard
      id="detalhes"
      title="Detalhes"
      description="Nome, data e cliente — aparecem na capa da galeria e no seu painel."
      pending={pending}
      onSave={() => save(() => updateDetailsAction({ collectionId: collection.id, ...form }), "Detalhes salvos", () => setErrors({}), setErrors)}
    >
      <div className="grid gap-2">
        <Label htmlFor="set-title">Nome da coleção</Label>
        <Input id="set-title" value={form.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} />
        <FieldError message={errors.title?.[0]} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="set-date">Data do evento</Label>
          <Input id="set-date" type="date" value={form.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="set-category">Categoria</Label>
          <Select id="set-category" value={form.category} onChange={(e) => set({ category: e.target.value as typeof form.category })}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="set-client">Cliente</Label>
        <Select id="set-client" value={form.clientId} onChange={(e) => set({ clientId: e.target.value })}>
          <option value="">Sem cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.email ? ` — ${c.email}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="set-description">Mensagem para o cliente</Label>
        <Textarea id="set-description" rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Opcional" />
      </div>
    </SettingsCard>
  );
}
