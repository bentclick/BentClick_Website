"use client";

import { Eye } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type { PublicGalleryView } from "@/types/public-gallery";
import { GalleryCover } from "./gallery-cover";
import { GalleryHeader } from "./gallery-header";
import { Lightbox } from "./lightbox";
import { LoadMoreSentinel, PhotoLayout } from "./photo-layout";
import { usePhotoPages } from "./use-photo-pages";

async function shareLink(title: string) {
  const url = window.location.href.split("?")[0]!;
  try {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  } catch (e) {
    if ((e as DOMException)?.name !== "AbortError") toast.error("Não foi possível compartilhar", { description: url });
  }
}

/** Orchestrates the client gallery; access was already decided on the server. */
export function ClientGallery({ view }: { view: PublicGalleryView }) {
  const firstId = view.galleries[0]?.id;
  const [active, setActive] = useState<string | undefined>(firstId);
  const [lightbox, setLightbox] = useState<{ index: number; playing: boolean } | null>(null);
  const { pages, ensure, loadMore } = usePhotoPages(view.slug, view.preview, firstId, view.firstPage);
  const main = useRef<HTMLElement>(null);

  const current = active ? pages[active] : undefined;
  const photos = current?.photos ?? [];
  const total = view.galleries.find((g) => g.id === active)?.count ?? photos.length;
  const more = useCallback(() => active && loadMore(active), [active, loadMore]);
  const share = () => void shareLink(view.title);

  function enter() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    main.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <>
      {view.preview ? (
        <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-accent py-1.5 text-[11.5px] font-medium text-white">
          <Eye className="size-3.5" /> Pré-visualização do fotógrafo — o cliente vê esta página somente após a publicação
        </div>
      ) : null}

      <GalleryCover
        title={view.title}
        eventDate={view.eventDate}
        coverUrl={view.coverUrl}
        coverColor={view.coverColor}
        canShare={view.features.share}
        onEnter={enter}
        onShare={share}
      />

      <main ref={main} className="min-h-dvh bg-background">
        <GalleryHeader
          title={view.title}
          eventDate={view.eventDate}
          canShare={view.features.share}
          onShare={share}
          onSlideshow={() => photos.length && setLightbox({ index: 0, playing: true })}
        />

        <div className="mx-auto max-w-[1800px] px-1.5 pb-24 sm:px-8">
          {view.galleries.length > 1 ? (
            <nav aria-label="Galerias" className="-mx-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <ul className="flex min-w-max items-center gap-7 py-7 sm:justify-center">
                {view.galleries.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActive(g.id);
                        ensure(g.id);
                      }}
                      aria-current={active === g.id ? "page" : undefined}
                      className={cn(
                        "caps border-b py-1.5 text-[10.5px] tracking-[0.18em] transition-colors duration-200",
                        active === g.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g.name} <span className="tabular-nums opacity-60">{g.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <div className="h-6" />
          )}

          {photos.length === 0 && !current?.loading ? (
            <p className="py-32 text-center font-serif text-2xl italic text-muted-foreground">
              {view.galleries.length === 0 ? "As fotos estarão aqui em breve." : "Nenhuma foto nesta galeria."}
            </p>
          ) : (
            <PhotoLayout layout={view.layout} photos={photos} onOpen={(index) => setLightbox({ index, playing: false })} />
          )}

          <LoadMoreSentinel onVisible={more} active={Boolean(current?.nextCursor) && !current?.loading} />
          {current?.loading ? <p className="py-10 text-center text-[12px] text-muted-foreground">Carregando fotos…</p> : null}
          {current?.error ? (
            <p className="py-10 text-center text-[12px] text-muted-foreground">
              Não foi possível carregar mais fotos.{" "}
              <button type="button" onClick={more} className="text-foreground underline underline-offset-4">
                Tentar de novo
              </button>
            </p>
          ) : null}

          <footer className="mt-20 flex flex-col items-center gap-2 text-center text-[11px] text-muted-foreground">
            <span className="font-serif text-base text-foreground">{view.studio.name}</span>
            Galeria entregue com BentClick
          </footer>
        </div>
      </main>

      {lightbox && photos[lightbox.index] ? (
        <Lightbox
          photos={photos}
          index={lightbox.index}
          total={total}
          playing={lightbox.playing}
          onIndex={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
          onClose={() => setLightbox(null)}
          onTogglePlay={() => setLightbox((l) => (l ? { ...l, playing: !l.playing } : l))}
          onNeedMore={more}
          onShare={view.features.share ? share : undefined}
        />
      ) : null}
    </>
  );
}
