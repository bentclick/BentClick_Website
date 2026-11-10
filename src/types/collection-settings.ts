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
  /** The current password, for the photographer to copy; null when none, or set before it was kept readable. */
  password: string | null;
  linkEnabled: boolean;
  allowFavorites: boolean;
  allowIndividualDownload: boolean;
  allowFullDownload: boolean;
  allowSharing: boolean;
  downloadQuality: DownloadQuality;
  layout: GalleryLayout;
};
