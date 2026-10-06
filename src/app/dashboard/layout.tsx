import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · BentClick" }, robots: { index: false } };

/** Authorisation boundary for every /dashboard route (proxy.ts is only a hint). */
export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
