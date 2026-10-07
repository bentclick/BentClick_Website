"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitSelectionAction } from "@/actions/public-gallery.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/field";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  count: number;
  initialName?: string | null;
  initialEmail?: string | null;
  onSubmitted: () => void;
};

/** Hands the client's hearts to the photographer, with who chose them. */
export function SelectionDialog({ open, onOpenChange, slug, count, initialName, initialEmail, onSubmitted }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitSelectionAction({ slug, clientName: name, clientEmail: email });
      if (!result.ok) {
        setErrors({
          clientName: result.fieldErrors?.clientName?.[0],
          clientEmail: result.fieldErrors?.clientEmail?.[0],
          form: result.fieldErrors ? undefined : result.error,
        });
        return;
      }
      toast.success("Seleção enviada", { description: `${result.data.count} fotos enviadas ao fotógrafo.` });
      onSubmitted();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Enviar seleção</DialogTitle>
        <DialogDescription>
          {count === 1 ? "Você marcou 1 foto." : `Você marcou ${count} fotos.`} O fotógrafo recebe a lista com o seu nome. Depois de enviada, a seleção fica fechada — para mudar, fale com o fotógrafo.
        </DialogDescription>
        <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sel-name">Seu nome</Label>
            <Input id="sel-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.clientName} />
            <FieldError message={errors.clientName} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sel-email">E-mail</Label>
            <Input id="sel-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.clientEmail} />
            <FieldError message={errors.clientEmail} />
          </div>
          <FieldError message={errors.form} />
          <Button type="submit" size="lg" disabled={pending || count === 0} className="mt-2">
            {pending ? <Loader2 className="animate-spin" /> : null}
            Enviar {count} {count === 1 ? "foto" : "fotos"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
