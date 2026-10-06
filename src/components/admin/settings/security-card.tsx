"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsCard } from "@/components/admin/collection-settings/settings-card";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";

/** Password change through Better Auth; other devices are signed out. */
export function SecurityCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 10) return setError("A nova senha precisa ter pelo menos 10 caracteres.");
    if (next !== confirm) return setError("As senhas não conferem.");
    setPending(true);
    setError(undefined);
    const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setPending(false);
    if (result.error) {
      setError(result.error.status === 400 || result.error.status === 401 ? "Senha atual incorreta." : (result.error.message ?? "Não foi possível trocar a senha."));
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Senha alterada", { description: "Outros dispositivos foram desconectados." });
  }

  return (
    <SettingsCard id="seguranca" title="Segurança" description="Troque a senha do painel. Os outros dispositivos são desconectados.">
      <form onSubmit={change} noValidate className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sec-current">Senha atual</Label>
          <Input id="sec-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sec-new">Nova senha</Label>
            <Input id="sec-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sec-confirm">Confirmar nova senha</Label>
            <Input id="sec-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <FieldError message={error} />
        <div>
          <Button type="submit" variant="outline" disabled={pending || !current || !next}>
            {pending ? <Loader2 className="animate-spin" /> : null} Trocar senha
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
