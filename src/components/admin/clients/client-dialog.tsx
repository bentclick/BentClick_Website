"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClientAction, deleteClientAction, updateClientAction } from "@/actions/client.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";

export type ClientRow = { id: string; name: string; email: string | null; phone: string | null; notes: string | null; collectionCount: number };

type Props = { open: boolean; onOpenChange: (open: boolean) => void; client?: ClientRow };

/** Create or edit a client; editing also offers removal. */
export function ClientDialog({ open, onOpenChange, client }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ name: client?.name ?? "", email: client?.email ?? "", phone: client?.phone ?? "", notes: client?.notes ?? "" });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = client ? await updateClientAction(client.id, form) : await createClientAction(form);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      toast.success(client ? "Cliente atualizado" : "Cliente cadastrado");
      onOpenChange(false);
      router.refresh();
    });
  }

  function remove() {
    if (!client) return;
    startTransition(async () => {
      const r = await deleteClientAction(client.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Cliente removido");
      onOpenChange(false);
      router.refresh();
    });
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        <DialogDescription>O e-mail é usado para enviar o link das galerias.</DialogDescription>
        <form onSubmit={save} noValidate className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cl-name">Nome</Label>
            <Input id="cl-name" autoFocus value={form.name} onChange={set("name")} aria-invalid={!!errors.name} />
            <FieldError message={errors.name?.[0]} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cl-email">E-mail</Label>
              <Input id="cl-email" type="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
              <FieldError message={errors.email?.[0]} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cl-phone">Telefone</Label>
              <Input id="cl-phone" type="tel" value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cl-notes">Observações</Label>
            <Textarea id="cl-notes" rows={3} value={form.notes} onChange={set("notes")} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {client ? (
              confirmDelete ? (
                <span className="flex items-center gap-2 text-[12.5px]">
                  Remover mesmo?
                  <Button type="button" size="sm" variant="danger" onClick={remove} disabled={pending}>
                    Remover
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Não
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>
                  Remover cliente
                </Button>
              )
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null} {client ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
          {client && client.collectionCount > 0 ? (
            <p className="text-[12px] text-muted-foreground">Ao remover, as {client.collectionCount} coleções continuam existindo, só sem cliente vinculado.</p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
