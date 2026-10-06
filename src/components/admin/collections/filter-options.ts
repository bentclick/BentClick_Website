import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants/collection";
import type { CollectionFilters } from "@/lib/validation/collection";
import type { FilterOption } from "./filter-menu";

type FilterKey = Exclude<keyof CollectionFilters, "q" | "view">;

export const FILTER_DEFAULTS: Record<keyof CollectionFilters, string> = {
  q: "",
  status: "all",
  category: "all",
  eventPeriod: "any",
  expiring: "any",
  favorites: "any",
  sort: "updated",
  view: "grid",
};

/** Toolbar menus in display order. */
export const FILTER_MENUS: { key: FilterKey; label: string; options: FilterOption[] }[] = [
  { key: "status", label: "Status", options: [{ value: "all", label: "Ativas" }, ...STATUS_OPTIONS] },
  { key: "category", label: "Categoria", options: [{ value: "all", label: "Todas as categorias" }, ...CATEGORY_OPTIONS] },
  {
    key: "eventPeriod",
    label: "Data do evento",
    options: [
      { value: "any", label: "Qualquer data" },
      { value: "upcoming", label: "Próximos eventos" },
      { value: "last30", label: "Últimos 30 dias" },
      { value: "last90", label: "Últimos 90 dias" },
      { value: "year", label: "Este ano" },
    ],
  },
  {
    key: "expiring",
    label: "Data de expiração",
    options: [
      { value: "any", label: "Qualquer expiração" },
      { value: "7", label: "Expira em 7 dias" },
      { value: "15", label: "Expira em 15 dias" },
      { value: "30", label: "Expira em 30 dias" },
    ],
  },
  {
    key: "favorites",
    label: "Favoritos",
    options: [
      { value: "any", label: "Com ou sem seleção" },
      { value: "with", label: "Com favoritos do cliente" },
    ],
  },
];

export const SORT_OPTIONS: FilterOption[] = [
  { value: "updated", label: "Atualizadas recentemente" },
  { value: "event", label: "Data do evento" },
  { value: "expires", label: "Expiram primeiro" },
  { value: "title", label: "Nome (A–Z)" },
];
