import type { PhotoStatus } from "@/generated/prisma/enums";

export type EditorPhoto = {
  id: string;
  filename: string;
  status: PhotoStatus;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  thumbnailUrl: string | null;
  color: string | null;
  isRaw: boolean;
  failureReason: string | null;
};
