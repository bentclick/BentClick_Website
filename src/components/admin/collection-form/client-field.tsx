"use client";

import { type UseFormReturn, useWatch } from "react-hook-form";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import type { CreateCollectionInput } from "@/lib/validation/collection";
import type { ClientOption } from "@/types/client";

type Props = { form: UseFormReturn<CreateCollectionInput>; clients: ClientOption[] };

/** Select an existing client, or switch to "Novo cliente" (name + email). */
export function ClientField({ form, clients }: Props) {
  const client = useWatch({ control: form.control, name: "client" });
  const errors = form.formState.errors.client as Record<string, { message?: string }> | undefined;
  const isNew = client.mode === "new";

  function switchMode() {
    form.setValue("client", isNew ? { mode: "none" } : { mode: "new", name: "", email: "" }, { shouldDirty: true });
    form.clearErrors("client");
  }

  function selectExisting(clientId: string) {
    form.setValue("client", clientId ? { mode: "existing", clientId } : { mode: "none" }, { shouldDirty: true });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={isNew ? "clientName" : "clientId"}>Cliente</Label>
        <button type="button" onClick={switchMode} className="text-[12px] font-medium text-accent transition-colors hover:text-accent-hover">
          {isNew ? "Selecionar existente" : "Novo cliente"}
        </button>
      </div>

      {isNew ? (
        <div className="grid gap-2.5 rounded-[5px] border border-border bg-background/60 p-3">
          <Input id="clientName" placeholder="Nome do cliente" aria-invalid={!!errors?.name} {...form.register("client.name")} />
          <FieldError message={errors?.name?.message} />
          <Input
            id="clientEmail"
            type="email"
            placeholder="E-mail do cliente"
            aria-invalid={!!errors?.email}
            {...form.register("client.email")}
          />
          <FieldError message={errors?.email?.message} />
        </div>
      ) : (
        <Select
          id="clientId"
          value={client.mode === "existing" ? client.clientId : ""}
          onChange={(e) => selectExisting(e.target.value)}
        >
          <option value="">{clients.length ? "Selecionar cliente" : "Nenhum cliente cadastrado"}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.email ? ` — ${c.email}` : ""}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
