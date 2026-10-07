"use client";

import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { SettingsCard } from "@/components/admin/collection-settings/settings-card";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { twoFactorCodeSchema } from "@/lib/validation/auth";

type Step =
  | { kind: "idle" }
  | { kind: "password"; intent: "enable" | "disable" | "codes" }
  | { kind: "scan"; totpURI: string; backupCodes: string[] }
  | { kind: "codes"; backupCodes: string[] };

/** The secret printed under the QR code, for typing into the app by hand. */
const secretOf = (uri: string) => new URL(uri).searchParams.get("secret") ?? "";

/**
 * Two-step login with an authenticator app. Turning it on needs the password,
 * then a code from the app — 2FA only counts as enabled once a code verifies.
 */
export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  function reset(next: Step = { kind: "idle" }) {
    setStep(next);
    setPassword("");
    setCode("");
    setError(undefined);
  }

  async function confirmPassword(intent: "enable" | "disable" | "codes") {
    if (!password) return setError("Informe sua senha.");
    setPending(true);
    setError(undefined);
    if (intent === "enable") {
      const r = await authClient.twoFactor.enable({ password, issuer: "BentClick" });
      setPending(false);
      if (r.error || !r.data) return setError(r.error?.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Senha incorreta.");
      if (r.data.method !== "totp") return setError("Não foi possível iniciar a configuração.");
      return reset({ kind: "scan", totpURI: r.data.totpURI, backupCodes: r.data.backupCodes });
    }
    if (intent === "disable") {
      const r = await authClient.twoFactor.disable({ password });
      setPending(false);
      if (r.error) return setError(r.error.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Senha incorreta.");
      toast.success("Verificação em duas etapas desativada");
      reset();
      return router.refresh();
    }
    const r = await authClient.twoFactor.generateBackupCodes({ password });
    setPending(false);
    if (r.error || !r.data) return setError(r.error?.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Senha incorreta.");
    reset({ kind: "codes", backupCodes: r.data.backupCodes });
  }

  async function verify(backupCodes: string[]) {
    const parsed = twoFactorCodeSchema.safeParse(code);
    if (!parsed.success) return setError("Digite os 6 dígitos do aplicativo.");
    setPending(true);
    setError(undefined);
    const r = await authClient.twoFactor.verifyTotp({ code: parsed.data });
    setPending(false);
    if (r.error) return setError(r.error.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Código incorreto. Confira o horário do celular.");
    toast.success("Verificação em duas etapas ativada");
    reset({ kind: "codes", backupCodes });
    router.refresh();
  }

  return (
    <SettingsCard
      id="duas-etapas"
      title="Verificação em duas etapas"
      description="Além da senha, o login pede um código do aplicativo autenticador do seu celular (Google Authenticator, Microsoft Authenticator, 1Password…)."
    >
      {step.kind === "idle" ? (
        <div className="grid gap-4">
          <p className="flex items-center gap-2 text-[13px]">
            {enabled ? <ShieldCheck className="size-4 text-success" /> : null}
            {enabled ? "Ativada. O login pede o código do aplicativo." : "Desativada. Recomendamos ativar: protege o painel mesmo se a senha vazar."}
          </p>
          <div className="flex flex-wrap gap-2">
            {enabled ? (
              <>
                <Button variant="outline" size="sm" onClick={() => reset({ kind: "password", intent: "codes" })}>
                  Gerar novos códigos de reserva
                </Button>
                <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => reset({ kind: "password", intent: "disable" })}>
                  Desativar
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => reset({ kind: "password", intent: "enable" })}>
                Ativar
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {step.kind === "password" ? (
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void confirmPassword(step.intent);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="tf-password">Confirme sua senha</Label>
            <Input id="tf-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
            <FieldError message={error} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null} Continuar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => reset()}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {step.kind === "scan" ? (
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(step.backupCodes);
          }}
        >
          <p className="text-[13px]">1. No aplicativo autenticador, escaneie o código abaixo.</p>
          <div className="w-fit rounded-[6px] border border-border bg-white p-3">
            <QRCode value={step.totpURI} size={168} />
          </div>
          <p className="text-[12px] text-muted-foreground">
            Sem câmera? Digite a chave: <code className="select-all break-all font-mono text-foreground">{secretOf(step.totpURI)}</code>
          </p>
          <div className="grid gap-2">
            <Label htmlFor="tf-verify">2. Digite o código de 6 dígitos que aparece no aplicativo</Label>
            <Input id="tf-verify" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} className="max-w-40 tracking-[0.3em]" />
            <FieldError message={error} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null} Confirmar e ativar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => reset()}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {step.kind === "codes" ? <BackupCodes codes={step.backupCodes} onDone={() => reset()} /> : null}
    </SettingsCard>
  );
}

function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      toast.error("Não foi possível copiar. Selecione os códigos e copie manualmente.");
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-[13px]">
        <strong className="font-medium">Guarde estes códigos de reserva</strong> num lugar seguro (gerenciador de senhas ou papel). Se perder o celular, cada
        código permite um login. Eles não serão mostrados de novo.
      </p>
      <ul className="grid select-all grid-cols-2 gap-x-6 gap-y-1 rounded-[6px] border border-border bg-background p-4 font-mono text-[13px] tabular-nums">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />} {copied ? "Copiados" : "Copiar códigos"}
        </Button>
        <Button size="sm" onClick={onDone}>
          Já guardei
        </Button>
      </div>
    </div>
  );
}
