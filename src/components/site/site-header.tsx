"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export const SITE_NAV = [
  { href: "/", label: "Início" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/about", label: "Sobre" },
  { href: "/contact", label: "Contato" },
] as const;

/** Pages whose first screen is a full-bleed photograph get a transparent header. */
const OVERLAY_PATHS = new Set(["/"]);

export function SiteHeader() {
  const pathname = usePathname();
  const overlayPage = OVERLAY_PATHS.has(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!overlayPage) return;
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayPage]);

  const transparent = overlayPage && !scrolled;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-40 transition-colors duration-300",
        overlayPage ? "fixed" : "sticky",
        transparent ? "bg-transparent text-white" : "border-b border-border bg-background/95 text-foreground backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-5 sm:px-10">
        <Link href="/" aria-label="BentClick — início">
          <Logo variant="horizontal" size={34} />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-10 lg:flex">
          <ul className="flex items-center gap-9">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "caps relative py-2 text-[11px] tracking-[0.18em] transition-opacity duration-200 hover:opacity-100",
                    isActive(item.href) ? "opacity-100" : "opacity-75",
                    "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100",
                    isActive(item.href) && "after:scale-x-100",
                    isActive(item.href) && !transparent && "text-accent",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/cliente"
            className={cn(
              "caps inline-flex h-10 items-center rounded-[4px] border px-5 text-[10.5px] tracking-[0.18em] transition-colors duration-200",
              transparent
                ? "border-white/80 hover:bg-white hover:text-foreground"
                : "border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover",
            )}
          >
            Área do cliente
          </Link>
        </nav>

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="-mr-2 grid size-11 place-items-center lg:hidden"
          >
            <Menu strokeWidth={1.4} className="size-6" />
          </button>
          <SheetContent side="right" aria-describedby={undefined} className="bg-background p-8">
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <Logo variant="stacked" size={56} className="self-start text-foreground" />
            <ul className="mt-14 grid gap-6">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn("font-serif text-3xl", isActive(item.href) && "text-accent")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/cliente"
              onClick={() => setMenuOpen(false)}
              className="caps mt-auto inline-flex h-12 items-center justify-center rounded-[4px] bg-accent text-[11px] text-white"
            >
              Área do cliente
            </Link>
          </SheetContent>
        </Dialog>
      </div>
    </header>
  );
}
