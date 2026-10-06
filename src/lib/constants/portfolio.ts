import { PortfolioCategory } from "@/generated/prisma/enums";

/** Public filter labels (plural, as on the site) and their URL slugs. */
export const PORTFOLIO_CATEGORIES: { value: PortfolioCategory; label: string; slug: string }[] = [
  { value: "WEDDING", label: "Casamentos", slug: "casamentos" },
  { value: "EVENT", label: "Eventos", slug: "eventos" },
  { value: "SESSION", label: "Ensaios", slug: "ensaios" },
  { value: "PEOPLE", label: "Pessoas", slug: "pessoas" },
  { value: "CORPORATE", label: "Corporativo", slug: "corporativo" },
  { value: "TRAVEL", label: "Viagens", slug: "viagens" },
  { value: "PRODUCT", label: "Produtos", slug: "produtos" },
];

export function categoryFromSlug(slug: string | undefined): PortfolioCategory | null {
  return PORTFOLIO_CATEGORIES.find((c) => c.slug === slug)?.value ?? null;
}

export const ALL_PORTFOLIO_CATEGORIES = Object.values(PortfolioCategory);
