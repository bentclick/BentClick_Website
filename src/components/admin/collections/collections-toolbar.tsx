"use client";

import { LayoutGrid, List, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import type { CollectionFilters } from "@/lib/validation/collection";
import { FilterMenu } from "./filter-menu";
import { FILTER_DEFAULTS, FILTER_MENUS, SORT_OPTIONS } from "./filter-options";

/** Filter menus, sort and view toggle — all state lives in the URL. */
export function CollectionsToolbar({ filters }: { filters: CollectionFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: keyof CollectionFilters, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === FILTER_DEFAULTS[key]) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function clearFilters() {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.view !== "grid") params.set("view", filters.view);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const activeCount = FILTER_MENUS.filter((m) => filters[m.key] !== FILTER_DEFAULTS[m.key]).length;

  return (
    <div className={cn("flex items-center gap-3 transition-opacity", isPending && "opacity-60")}>
      <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {FILTER_MENUS.map((menu) => (
          <FilterMenu
            key={menu.key}
            label={menu.label}
            value={filters[menu.key]}
            defaultValue={FILTER_DEFAULTS[menu.key]}
            options={menu.options}
            onChange={(v) => update(menu.key, v)}
          />
        ))}
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-9 shrink-0 items-center gap-1 px-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" /> Limpar filtros
          </button>
        ) : null}
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <FilterMenu
          label="Ordenar"
          value={filters.sort}
          defaultValue={filters.sort}
          options={SORT_OPTIONS}
          onChange={(v) => update("sort", v)}
        />
        <div role="group" aria-label="Visualização" className="flex rounded-[5px] border border-border bg-surface p-0.5">
          {(
            [
              ["grid", LayoutGrid, "Grade"],
              ["list", List, "Lista"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={filters.view === value}
              onClick={() => update("view", value)}
              className={cn(
                "grid size-8 place-items-center rounded-[4px] text-muted-foreground transition-colors hover:text-foreground",
                filters.view === value && "bg-subtle text-foreground",
              )}
            >
              <Icon strokeWidth={1.5} className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
