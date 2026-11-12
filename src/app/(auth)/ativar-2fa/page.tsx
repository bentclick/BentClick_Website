import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { requireSessionAllowingSetup } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ativar verificação em duas etapas", robots: { index: false } };

/**
 * Outside /dashboard on purpose: an account without the authenticator lands here and nothing of the dashboard (or its
 * data) is rendered until the code is set up (session.ts sends every dashboard page here meanwhile).
 */
export default async function TwoFactorSetupPage() {
  const session = await requireSessionAllowingSetup();
  if (!session) redirect("/login");
  if (session.twoFactorEnabled) redirect("/dashboard/collections");
  return <TwoFactorSetup email={session.user.email} />;
}
