"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { identifyVisitorAction } from "@/actions/public-gallery.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/field";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  studio: string;
  onIdentified: (identity: { name: string; email: string }) => void;
};

/** Galleries set to "ask name and e-mail": shown before the first heart or download. */
export function IdentityDialog({ open, onOpenChange, slug, studio, onIdentified }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await identifyVisitorAction({ slug, clientName: name, clientEmail: email });
      if (!result.ok) {
        setErrors({
          clientName: result.fieldErrors?.clientName?.[0],
          clientEmail: result.fieldErrors?.clientEmail?.[0],
          form: result.fieldErrors ? undefined : result.error,
        });
        return;
      }
      onIdentified({ name: name.trim(), email: email.trim() });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Antes de continuar</DialogTitle>
        <DialogDescription>{studio} pediu seu nome e e-mail para saber quem escolheu e baixou as fotos.</DialogDescription>
        <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="id-name">Seu nome</Label>
            <Input id="id-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.clientName} />
            <FieldError message={errors.clientName} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="id-email">E-mail</Label>
            <Input id="id-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.clientEmail} />
            <FieldError message={errors.clientEmail} />
          </div>
          <FieldError message={errors.form} />
          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? <Loader2 className="animate-spin" /> : null} Continuar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
