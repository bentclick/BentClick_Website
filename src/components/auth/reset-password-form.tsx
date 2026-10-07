"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { resetPasswordSchema } from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      return setErrors({ password: f.password?.[0], confirm: f.confirm?.[0] });
    }
    setPending(true);
    setErrors({});
    const result = await authClient.resetPassword({ newPassword: parsed.data.password, token });
    setPending(false);
    if (result.error) {
      return setErrors({ form: result.error.status === 429 ? "Muitas tentativas. Aguarde alguns minutos." : "Este link expirou ou já foi usado. Peça um novo." });
    }
    toast.success("Senha redefinida", { description: "Entre com a nova senha." });
    router.replace("/login");
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="rp-password">Nova senha</Label>
        <Input id="rp-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
        <FieldError message={errors.password} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rp-confirm">Confirmar nova senha</Label>
        <Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
        <FieldError message={errors.confirm} />
      </div>
      {errors.form ? (
        <p role="alert" className="rounded-[6px] bg-danger/8 px-3 py-2 text-[13px] text-danger">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : null} Salvar nova senha
      </Button>
    </form>
  );
}
