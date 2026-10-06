import { cookies } from "next/headers";
import { DashboardShell } from "@/components/admin/shell/dashboard-shell";
import { SIDEBAR_COOKIE } from "@/components/admin/shell/nav-items";
import { requireUser } from "@/lib/auth/session";
import { getPhotographerProfile } from "@/services/profile/profile.service";
import { getStorageUsage } from "@/services/storage/storage.service";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [profile, storage, cookieStore] = await Promise.all([
    getPhotographerProfile(user.id, user.name),
    getStorageUsage(user.id),
    cookies(),
  ]);

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, title: profile.professionalTitle }}
      storage={{ usedBytes: storage.usedBytes, quotaBytes: storage.quotaBytes }}
      initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </DashboardShell>
  );
}
