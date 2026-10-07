import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Esqueci minha senha" description="Informe o e-mail do painel. Se ele tiver conta, enviamos um link para criar uma nova senha.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
