"use client";

import type { UseFormReturn } from "react-hook-form";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { CATEGORY_OPTIONS } from "@/lib/constants/collection";
import type { CreateCollectionInput } from "@/lib/validation/collection";
import type { ClientOption } from "@/types/client";
import { ClientField } from "./client-field";

type Props = { form: UseFormReturn<CreateCollectionInput>; clients: ClientOption[] };

/** Left column: what the collection is and who it is for. */
export function BasicFields({ form, clients }: Props) {
  const { errors } = form.formState;

  return (
    <div className="grid content-start gap-6">
      <div className="grid gap-2">
        <Label htmlFor="title">
          Nome da coleção <span className="text-accent">*</span>
        </Label>
        <Input id="title" placeholder="Ex: Ana Caroline" autoFocus aria-invalid={!!errors.title} {...form.register("title")} />
        <FieldError message={errors.title?.message} />
      </div>

      <ClientField form={form} clients={clients} />

      <div className="grid gap-2">
        <Label htmlFor="eventDate">Data do evento</Label>
        <Input id="eventDate" type="date" aria-invalid={!!errors.eventDate} {...form.register("eventDate")} />
        <FieldError message={errors.eventDate?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">
          Categoria <span className="text-accent">*</span>
        </Label>
        <Select id="category" {...form.register("category")}>
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
