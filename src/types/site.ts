import type { PortfolioCategory } from "@/generated/prisma/enums";

export type PublicImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  category: PortfolioCategory;
};

/** A published album as shown on the public portfolio page. */
export type PublicAlbum = {
  id: string;
  slug: string;
  title: string;
  category: PortfolioCategory;
  imageCount: number;
  coverUrl: string;
  color: string | null;
};

export type SiteProfile = {
  name: string;
  tagline: string | null;
  bio: string | null;
  email: string | null;
  instagram: string | null;
  websiteUrl: string | null;
  /** The photographer's own photo (About page), when uploaded. */
  portrait: { src: string; width: number; height: number } | null;
};

/** A portfolio photo that can be chosen in the site editor. */
export type PickableImage = { id: string; thumbUrl: string; album: string };
