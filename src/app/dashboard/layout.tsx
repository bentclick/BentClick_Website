import type { Metadata } from "next";
import { EditorStorageSweep } from "@/components/auth/editor-storage-sweep";
import { SessionActivity } from "@/components/auth/session-activity";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · BentClick" }, robots: { index: false } };

/** Authorisation boundary for every /dashboard route (proxy.ts is only a hint); every page also checks for itself. */
export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <SessionActivity />
      <EditorStorageSweep />
      {children}
    </>
  );
}
