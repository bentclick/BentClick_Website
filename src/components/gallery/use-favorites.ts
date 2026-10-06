"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/actions/public-gallery.actions";
import type { PublicPhoto } from "@/types/public-gallery";

/** Optimistic hearts: flip immediately, reconcile with the server, roll back on failure. */
export function useFavorites(slug: string, initialIds: string[]) {
  const [ids, setIds] = useState(() => new Set(initialIds));
  const [list, setList] = useState<PublicPhoto[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const toggle = useCallback(
    async (photo: PublicPhoto) => {
      const wasFavorite = ids.has(photo.id);
      const flip = (on: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (on) next.add(photo.id);
          else next.delete(photo.id);
          return next;
        });
      flip(!wasFavorite);
      setList((l) => (l ? (wasFavorite ? l.filter((p) => p.id !== photo.id) : [...l, photo]) : l));

      const result = await toggleFavoriteAction(slug, photo.id);
      if (!result.ok) {
        flip(wasFavorite);
        setList((l) => (l ? (wasFavorite ? [...l, photo] : l.filter((p) => p.id !== photo.id)) : l));
        toast.error(result.error);
        return;
      }
      if (!wasFavorite && ids.size === 0) {
        toast("Adicionada aos favoritos", { description: "Quando terminar, envie sua seleção em Favoritos." });
      }
    },
    [ids, slug],
  );

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/g/${slug}/api/favorites`, { cache: "no-store" });
      const data = (await res.json()) as { photos?: PublicPhoto[] };
      setList(data.photos ?? []);
    } catch {
      toast.error("Não foi possível carregar seus favoritos");
    } finally {
      setLoadingList(false);
    }
  }, [slug]);

  return { ids, count: ids.size, toggle, list, loadList, loadingList };
}
