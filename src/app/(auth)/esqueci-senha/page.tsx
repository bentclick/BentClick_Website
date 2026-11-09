import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default async function ForgotPasswordPage() {
  await connection(); // a static page would have no CSP nonce and its scripts would be blocked
  return (
    <AuthShell title="Esqueci minha senha" description="Informe o e-mail do painel. Se ele tiver conta, enviamos um link para criar uma nova senha.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
