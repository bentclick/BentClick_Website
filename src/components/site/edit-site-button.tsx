"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SECTION_FOR_PATH: Record<string, string> = { "/": "abertura", "/about": "sobre", "/contact": "contato", "/cliente": "area-do-cliente", "/portfolio": "trabalhos" };

/**
 * Public pages are static, so the server can't know who is looking. The
 * browser asks the auth endpoint; only a signed-in photographer sees the button.
 */
export function EditSiteButton() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/get-session", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => alive && setSignedIn(Boolean(s?.user)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!signedIn) return null;
  const anchor = SECTION_FOR_PATH[pathname] ?? "abertura";

  return (
    <Link
      href={`/dashboard/site#${anchor}`}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-[12.5px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(17,17,17,0.5)] transition-colors hover:bg-accent active:scale-[0.97]"
    >
      <PenLine className="size-4" strokeWidth={1.5} /> Editar site
    </Link>
  );
}
