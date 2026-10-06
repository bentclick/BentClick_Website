import type { GalleryLayout } from "@/generated/prisma/enums";

export type PublicPhoto = {
  id: string;
  filename: string;
  width: number;
  height: number;
  color: string | null;
  thumbUrl: string;
  previewUrl: string;
};

export type PhotoPage = { photos: PublicPhoto[]; nextCursor: string | null };

export type PublicGalleryView = {
  slug: string;
  title: string;
  eventDate: string | null;
  layout: GalleryLayout;
  preview: boolean;
  coverUrl: string | null;
  coverColor: string | null;
  studio: { name: string; accent: string };
  features: { favorites: boolean; download: boolean; fullDownload: boolean; share: boolean; requireIdentity: boolean };
  galleries: { id: string; name: string; count: number }[];
  firstPage: PhotoPage;
};
