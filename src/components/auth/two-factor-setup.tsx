"use client";

import { LogOut } from "lucide-react";
import { TwoFactorCard } from "@/components/admin/settings/two-factor-card";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

/** The one screen of an account without the authenticator: set it up, or leave. */
export function TwoFactorSetup({ email }: { email: string }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl content-center gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <Logo variant="horizontal" size={32} />
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await authClient.signOut();
            window.location.assign("/login");
          }}
        >
          <LogOut /> Sair
        </Button>
      </header>
      <div>
        <h1 className="font-serif text-[36px] font-medium leading-tight">Proteja o painel com o celular</h1>
        <p className="mt-3 max-w-xl text-[13.5px] text-muted-foreground">
          A partir de agora o painel pede, além da senha, um código do aplicativo autenticador. Ative uma vez para {email} e continue de onde parou.
        </p>
      </div>
      <TwoFactorCard enabled={false} onEnabled={() => window.location.assign("/dashboard/collections")} />
    </main>
  );
}
