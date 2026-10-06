"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { SIDEBAR_COOKIE } from "./nav-items";
import { SidebarContent, type SidebarData } from "./sidebar-content";

type DashboardShellProps = SidebarData & { initialCollapsed: boolean; children: React.ReactNode };

/**
 * Desktop: fixed 240px sidebar, collapsible to 72px (persisted in a cookie so
 * the server renders the right width). Mobile: top bar + drawer.
 */
export function DashboardShell({ initialCollapsed, children, ...sidebar }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // The drawer closes through SidebarContent's onNavigate on every link click.
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="min-h-dvh">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 md:block",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <SidebarContent {...sidebar} collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-7 grid size-6 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/dashboard/collections" aria-label="BentClick — Coleções">
          <Logo variant="horizontal" size={26} />
        </Link>
        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="-mr-2 grid size-11 place-items-center rounded-[5px] hover:bg-subtle"
          >
            <Menu strokeWidth={1.5} className="size-5" />
          </button>
          <SheetContent aria-describedby={undefined}>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <SidebarContent {...sidebar} onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Dialog>
      </header>

      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-[72px]" : "md:pl-60")}>{children}</div>
    </div>
  );
}
