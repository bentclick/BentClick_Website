"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendGalleryEmailAction } from "@/actions/email.actions";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";

type Props = { collectionId: string; defaultRecipient: string; defaultMessage: string; published: boolean };

export function EmailForm({ collectionId, defaultRecipient, defaultMessage, published }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ recipient: defaultRecipient, subject: "Sua galeria está pronta", message: defaultMessage });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendGalleryEmailAction({ collectionId, ...form });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      toast.success("E-mail enviado", { description: form.recipient });
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="mail-to">Para</Label>
        <Input id="mail-to" type="email" value={form.recipient} onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} placeholder="cliente@email.com" aria-invalid={!!errors.recipient} />
        <FieldError message={errors.recipient?.[0]} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mail-subject">Assunto</Label>
        <Input id="mail-subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} aria-invalid={!!errors.subject} />
        <FieldError message={errors.subject?.[0]} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mail-message">Mensagem</Label>
        <Textarea id="mail-message" rows={7} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} aria-invalid={!!errors.message} />
        <FieldError message={errors.message?.[0]} />
        <FieldHint>O e-mail inclui o botão “Ver galeria” com o link. A senha, se houver, não é enviada.</FieldHint>
      </div>
      <div>
        <Button type="submit" disabled={pending || !published}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} Enviar galeria
        </Button>
        {!published ? <p className="mt-2 text-[12px] text-muted-foreground">Publique a galeria para poder enviar o link.</p> : null}
      </div>
    </form>
  );
}
