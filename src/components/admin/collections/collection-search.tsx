"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Debounced search that writes `?q=` into the URL. */
export function CollectionSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (query.trim() === initialQuery) return;
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(id);
  }, [query, initialQuery, pathname, router, searchParams]);

  return (
    <div className="relative w-full sm:w-72">
      <Search aria-hidden strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquisar coleções..."
        aria-label="Pesquisar coleções"
        className="h-9 w-full rounded-[5px] border border-border bg-surface pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/80 transition-colors hover:border-taupe focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15"
      />
    </div>
  );
}
