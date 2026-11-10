import type { PhotoStatus } from "@/generated/prisma/enums";

export type EditorPhoto = {
  id: string;
  filename: string;
  status: PhotoStatus;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  thumbnailUrl: string | null;
  /** Larger rendition for the full-screen viewer; null until the preview exists. */
  previewUrl: string | null;
  color: string | null;
  isRaw: boolean;
  isEdited: boolean;
  failureReason: string | null;
};
