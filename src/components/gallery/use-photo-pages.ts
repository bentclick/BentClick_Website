"use client";

import { useCallback, useRef, useState } from "react";
import type { PhotoPage, PublicPhoto } from "@/types/public-gallery";

type GalleryState = { photos: PublicPhoto[]; nextCursor: string | null; loading: boolean; error: boolean };

/** Per-gallery photo cache with cursor paging; switching tabs keeps what was already loaded. */
export function usePhotoPages(slug: string, preview: boolean, firstGalleryId: string | undefined, firstPage: PhotoPage) {
  const [state, setState] = useState<Record<string, GalleryState>>(() =>
    firstGalleryId ? { [firstGalleryId]: { photos: firstPage.photos, nextCursor: firstPage.nextCursor, loading: false, error: false } } : {},
  );
  const inflight = useRef(new Set<string>());

  const load = useCallback(
    async (galleryId: string, cursor: string | null) => {
      if (inflight.current.has(galleryId)) return;
      inflight.current.add(galleryId);
      setState((s) => ({ ...s, [galleryId]: { ...(s[galleryId] ?? { photos: [], nextCursor: null }), loading: true, error: false } }));
      try {
        const params = new URLSearchParams({ gallery: galleryId });
        if (cursor) params.set("cursor", cursor);
        if (preview) params.set("preview", "1");
        const res = await fetch(`/g/${slug}/api/photos?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const page = (await res.json()) as PhotoPage;
        setState((s) => ({
          ...s,
          [galleryId]: { photos: [...(cursor ? (s[galleryId]?.photos ?? []) : []), ...page.photos], nextCursor: page.nextCursor, loading: false, error: false },
        }));
      } catch {
        setState((s) => ({ ...s, [galleryId]: { ...(s[galleryId] ?? { photos: [], nextCursor: null }), loading: false, error: true } }));
      } finally {
        inflight.current.delete(galleryId);
      }
    },
    [slug, preview],
  );

  const ensure = useCallback(
    (galleryId: string) => {
      if (!state[galleryId]) void load(galleryId, null);
    },
    [state, load],
  );

  const loadMore = useCallback(
    (galleryId: string) => {
      const g = state[galleryId];
      if (g?.nextCursor && !g.loading) void load(galleryId, g.nextCursor);
    },
    [state, load],
  );

  return { pages: state, ensure, loadMore };
}
