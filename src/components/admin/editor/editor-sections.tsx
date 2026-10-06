"use client";

import { Activity, Heart, Images, Palette, Settings2, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Section = { slug: string; label: string; icon: typeof Images; enabled: boolean };

// Sections without a page yet stay visible but inert, so the structure doesn't shift as they ship.
export const EDITOR_SECTIONS: Section[] = [
  { slug: "", label: "Fotos", icon: Images, enabled: true },
  { slug: "selections", label: "Seleções", icon: Heart, enabled: true },
  { slug: "settings", label: "Configurações", icon: Settings2, enabled: true },
  { slug: "sharing", label: "Compartilhamento", icon: Share2, enabled: true },
  { slug: "design", label: "Design", icon: Palette, enabled: false },
  { slug: "activity", label: "Atividade", icon: Activity, enabled: true },
];

type Props = { collectionId: string; selectionCount: number; children: React.ReactNode };

/** Vertical section menu; the gallery list nests under "Fotos". */
export function EditorSections({ collectionId, selectionCount, children }: Props) {
  const pathname = usePathname();
  const base = `/dashboard/collections/${collectionId}`;
  const current = pathname === base ? "" : pathname.slice(base.length + 1).split("/")[0];

  return (
    <nav aria-label="Seções da coleção" className="px-3 py-4">
      <ul className="grid gap-0.5">
        {EDITOR_SECTIONS.map(({ slug, label, icon: Icon, enabled }) => {
          const active = current === slug;
          const content = (
            <>
              <Icon strokeWidth={1.4} className={cn("size-[17px] shrink-0", active ? "text-accent" : "text-muted-foreground")} />
              <span className="flex-1">{label}</span>
              {slug === "selections" && selectionCount > 0 ? (
                <span className="rounded-[3px] bg-accent px-1.5 text-[10.5px] font-medium leading-4 text-white tabular-nums">{selectionCount}</span>
              ) : null}
            </>
          );
          return (
            <li key={label}>
              {enabled ? (
                <Link
                  href={slug ? `${base}/${slug}` : base}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-[5px] px-3 text-[13px] transition-colors duration-200 hover:bg-subtle",
                    active && "bg-accent-soft font-medium text-accent-hover hover:bg-accent-soft",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span aria-disabled title={`${label} — em breve`} className="flex h-10 cursor-not-allowed items-center gap-3 rounded-[5px] px-3 text-[13px] opacity-45">
                  {content}
                </span>
              )}
              {slug === "" && active ? <div className="mb-2 ml-4 mt-1 border-l border-border pl-2">{children}</div> : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
