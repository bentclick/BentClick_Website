import type { CollectionCategory, CollectionStatus, DownloadQuality, GalleryLayout } from "@/generated/prisma/enums";

/** Serialisable snapshot of everything the Configurações page edits. */
export type CollectionSettingsView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  eventDate: string; // yyyy-mm-dd or ""
  category: CollectionCategory;
  clientId: string;
  status: CollectionStatus;
  expiresAt: string | null;
  isPrivate: boolean;
  requireClientIdentity: boolean;
  hasPassword: boolean;
  linkEnabled: boolean;
  allowFavorites: boolean;
  allowIndividualDownload: boolean;
  allowFullDownload: boolean;
  allowSharing: boolean;
  downloadQuality: DownloadQuality;
  layout: GalleryLayout;
};
