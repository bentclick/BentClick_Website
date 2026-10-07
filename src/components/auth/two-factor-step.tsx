"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { twoFactorCodeSchema } from "@/lib/validation/auth";

/** Second login step: authenticator code, or a single-use backup code. */
export function TwoFactorStep({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const parsed = twoFactorCodeSchema.safeParse(code);
    if (!parsed.success) return setError(backup ? "Informe um código de reserva." : "Informe os 6 dígitos do aplicativo.");
    setPending(true);
    setError(undefined);
    const result = backup
      ? await authClient.twoFactor.verifyBackupCode({ code: parsed.data, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code: parsed.data, trustDevice });
    setPending(false);
    if (result.error) {
      setError(
        result.error.status === 429
          ? "Muitas tentativas. Aguarde um minuto."
          : result.error.status === 401 && /expired|invalid two factor cookie/i.test(result.error.message ?? "")
            ? "O tempo para confirmar acabou. Entre de novo."
            : "Código incorreto.",
      );
      return;
    }
    onVerified();
  }

  return (
    <form onSubmit={verify} noValidate className="grid gap-5">
      <div>
        <p className="font-serif text-[24px] font-medium leading-tight">Verificação em duas etapas</p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {backup ? "Digite um dos seus códigos de reserva. Cada código vale uma vez." : "Abra o aplicativo autenticador e digite o código de 6 dígitos."}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tf-code">{backup ? "Código de reserva" : "Código"}</Label>
        <Input
          id="tf-code"
          autoFocus
          inputMode={backup ? "text" : "numeric"}
          autoComplete="one-time-code"
          maxLength={backup ? 24 : 6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={!!error}
          className="tracking-[0.3em]"
        />
        <FieldError message={error} />
      </div>
      <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} className="accent-[var(--accent)]" />
        Confiar neste dispositivo por 30 dias
      </label>
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : null} Confirmar
      </Button>
      <div className="flex justify-between text-[13px] text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setBackup(!backup);
            setCode("");
            setError(undefined);
          }}
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {backup ? "Usar o aplicativo" : "Usar código de reserva"}
        </button>
        <button type="button" onClick={onCancel} className="underline-offset-4 hover:text-foreground hover:underline">
          Voltar
        </button>
      </div>
    </form>
  );
}
