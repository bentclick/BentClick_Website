import type { PortfolioCategory } from "@/generated/prisma/enums";

export type PublicImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  category: PortfolioCategory;
};

export type SiteProfile = {
  name: string;
  tagline: string | null;
  bio: string | null;
  email: string | null;
  instagram: string | null;
  websiteUrl: string | null;
};

/** A portfolio photo that can be chosen in the site editor. */
export type PickableImage = { id: string; thumbUrl: string; album: string };
