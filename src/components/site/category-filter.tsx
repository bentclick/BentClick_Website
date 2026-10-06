import Link from "next/link";
import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";
import { cn } from "@/lib/utils/cn";

/** TODOS · CASAMENTOS · … — plain links so every filter is a shareable URL. */
export function CategoryFilter({ activeSlug }: { activeSlug: string | null }) {
  const items = [{ slug: null, label: "Todos" }, ...PORTFOLIO_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label }))];

  return (
    <nav aria-label="Categorias" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-7 sm:justify-center">
        {items.map((item) => {
          const active = item.slug === activeSlug;
          return (
            <li key={item.label}>
              <Link
                href={item.slug ? `/portfolio?categoria=${item.slug}` : "/portfolio"}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "caps block border-b py-2 text-[10.5px] tracking-[0.18em] transition-colors duration-200",
                  active ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
