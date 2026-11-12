import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { EditorStorageSweep } from "@/components/auth/editor-storage-sweep";
import { LoginForm } from "@/components/auth/login-form";
import { isSignupAllowed } from "@/lib/auth/auth";
import { requireSessionAllowingSetup, TWO_FACTOR_SETUP_PATH } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Decided here, on the real session, not in proxy.ts: a revoked cookie there bounced between /login and the dashboard.
  const session = await requireSessionAllowingSetup();
  if (session) redirect(session.twoFactorEnabled ? safeNextPath(next) : TWO_FACTOR_SETUP_PATH);

  return (
    <AuthShell title="Bem-vindo de volta" description="Entre para gerenciar suas coleções.">
      <EditorStorageSweep />
      <LoginForm nextPath={safeNextPath(next)} allowSignup={isSignupAllowed} />
    </AuthShell>
  );
}
