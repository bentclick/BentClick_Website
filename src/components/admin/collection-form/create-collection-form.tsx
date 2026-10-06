"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createCollectionAction } from "@/actions/collection.actions";
import { Button } from "@/components/ui/button";
import { type CreateCollectionInput, createCollectionSchema } from "@/lib/validation/collection";
import type { ClientOption } from "@/types/client";
import type { WatermarkOption } from "@/types/watermark";
import { AccessFields } from "./access-fields";
import { BasicFields } from "./basic-fields";

type Props = {
  defaultValues: CreateCollectionInput;
  clients: ClientOption[];
  watermarks: WatermarkOption[];
};

/** Orchestrates both columns; validation is the shared Zod contract, re-checked on the server. */
export function CreateCollectionForm({ defaultValues, clients, watermarks }: Props) {
  const router = useRouter();
  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await createCollectionAction(values);
    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof CreateCollectionInput, { message: messages[0] });
      }
      toast.error(result.error);
      return;
    }
    toast.success("Coleção criada", { description: "Agora é só adicionar as fotos." });
    router.push(`/dashboard/collections/${result.data.id}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[8px] border border-border bg-surface">
      <div className="grid gap-x-12 gap-y-6 p-6 sm:p-8 md:grid-cols-2">
        <BasicFields form={form} clients={clients} />
        <AccessFields form={form} watermarks={watermarks} />
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-b-[8px] border-t border-border bg-surface px-6 py-4 sm:px-8">
        <Button asChild variant="outline">
          <Link href="/dashboard/collections">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          Criar coleção
        </Button>
      </div>
    </form>
  );
}
