"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { signInSchema } from "@/lib/validation/auth";

/** Always shows the same confirmation, so the form never reveals which e-mails have an account. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signInSchema.shape.email.safeParse(email.trim());
    if (!parsed.success) return setError("Informe um e-mail válido.");
    setPending(true);
    setError(undefined);
    const result = await authClient.requestPasswordReset({ email: parsed.data, redirectTo: "/redefinir-senha" });
    setPending(false);
    if (result.error?.status === 429) return setError("Muitos pedidos. Tente de novo mais tarde.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="grid gap-5">
        <p className="flex items-start gap-3 rounded-[6px] bg-accent-soft px-4 py-3 text-[13px]">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" />
          Se este e-mail tiver conta, o link chega em instantes. Ele vale por 30 minutos.
        </p>
        <Link href="/login" className="text-[13px] underline underline-offset-4">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="fp-email">E-mail</Label>
        <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
        <FieldError message={error} />
      </div>
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : null} Enviar link
      </Button>
      <Link href="/login" className="text-center text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Voltar para o login
      </Link>
    </form>
  );
}
