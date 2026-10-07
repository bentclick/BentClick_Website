import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const valid = !error && typeof token === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(token);

  return (
    <AuthShell title="Nova senha" description={valid ? "Crie uma nova senha para o painel. Os outros dispositivos serão desconectados." : "Este link expirou ou já foi usado."}>
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Link href="/esqueci-senha" className="text-[13px] underline underline-offset-4">
          Pedir um novo link
        </Link>
      )}
    </AuthShell>
  );
}
