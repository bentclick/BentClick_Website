import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";
import { SidebarNav } from "./sidebar-nav";
import { StorageMeter } from "./storage-meter";
import { UserMenu } from "./user-menu";

export type SidebarData = {
  user: { name: string; email: string; title: string };
  storage: { usedBytes: number; quotaBytes: number };
};

type SidebarContentProps = SidebarData & { collapsed?: boolean; onNavigate?: () => void };

/** Shared body of the desktop sidebar and the mobile drawer. */
export function SidebarContent({ user, storage, collapsed = false, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-20 items-center px-6", collapsed && "justify-center px-0")}>
        <Link href="/dashboard/collections" onClick={onNavigate} className="text-foreground" aria-label="BentClick — Coleções">
          <Logo variant={collapsed ? "mark" : "horizontal"} size={30} className={collapsed ? "h-8" : undefined} />
        </Link>
      </div>

      <nav aria-label="Principal" className={cn("flex-1 px-3 pt-2", collapsed && "px-2")}>
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </nav>

      <div className={cn("grid gap-1 p-3", collapsed && "px-2")}>
        <StorageMeter usedBytes={storage.usedBytes} quotaBytes={storage.quotaBytes} collapsed={collapsed} />
        <div className="mx-3 h-px bg-border" />
        <UserMenu name={user.name} email={user.email} title={user.title} collapsed={collapsed} />
      </div>
    </div>
  );
}
