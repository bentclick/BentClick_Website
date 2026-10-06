"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { PRIMARY_NAV } from "./nav-items";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

/** Reads the nav config itself: icon components can't cross the server→client boundary as props. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <ul className="grid gap-0.5">
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-[5px] px-3 text-[13px] text-foreground/80 transition-colors duration-200 hover:bg-subtle hover:text-foreground",
                active && "bg-accent-soft font-medium text-accent-hover hover:bg-accent-soft hover:text-accent-hover",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon aria-hidden strokeWidth={1.4} className={cn("size-[17px] shrink-0", active ? "text-accent" : "text-muted-foreground")} />
              <span className={cn(collapsed && "sr-only")}>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
