import type { EditorPhoto } from "@/types/photo";
import type { PublicPhoto } from "@/types/public-gallery";

/** The photos the full-screen viewer can show: those with a rendered preview, in grid order. */
export function viewablePhotos(photos: EditorPhoto[]): PublicPhoto[] {
  return photos.flatMap((p) =>
    p.status === "READY" && p.thumbnailUrl
      ? [{ id: p.id, filename: p.filename, width: p.width ?? 3, height: p.height ?? 2, color: p.color, thumbUrl: p.thumbnailUrl, previewUrl: p.previewUrl ?? p.thumbnailUrl }]
      : [],
  );
}
