import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isSignupAllowed } from "@/lib/auth/auth";
import { safeNextPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <AuthShell title="Bem-vindo de volta" description="Entre para gerenciar suas coleções.">
      <LoginForm nextPath={safeNextPath(next)} allowSignup={isSignupAllowed} />
    </AuthShell>
  );
}
