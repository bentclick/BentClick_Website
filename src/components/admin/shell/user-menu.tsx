"use client";

import { ChevronsUpDown, ExternalLink, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

type UserMenuProps = { name: string; email: string; title: string; collapsed?: boolean };

export function UserMenu({ name, email, title, collapsed = false }: UserMenuProps) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-[5px] p-2 text-left transition-colors hover:bg-subtle data-[state=open]:bg-subtle",
          collapsed && "justify-center",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-taupe font-serif text-[15px] text-foreground">
          {initials(name)}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{name}</span>
              <span className="block truncate text-[12px] text-muted-foreground">{title}</span>
            </span>
            <ChevronsUpDown aria-hidden className="size-3.5 text-muted-foreground" />
          </>
        ) : (
          <span className="sr-only">Menu da conta</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>Conectado como</DropdownMenuLabel>
        <p className="truncate px-2.5 pb-2 text-[13px]">{email}</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank">
            <ExternalLink /> Ver site público
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
