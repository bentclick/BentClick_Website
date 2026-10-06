import type { CollectionCategory, CollectionStatus } from "@/generated/prisma/enums";

/** Serialisable shape passed from server components to client components. */
export type CollectionListItem = {
  id: string;
  title: string;
  slug: string;
  clientName: string | null;
  category: CollectionCategory;
  status: CollectionStatus; // effective status
  eventDate: string | null; // ISO
  expiresAt: string | null; // ISO
  photoCount: number;
  favoriteCount: number;
  coverUrl: string | null;
  coverColor: string | null;
  updatedAt: string;
};
