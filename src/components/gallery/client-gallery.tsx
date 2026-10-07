"use client";

import { ArrowLeft, Check, Download, Eye, Heart, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArchiveDialog } from "@/components/downloads/archive-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { PublicGalleryView, PublicPhoto } from "@/types/public-gallery";
import { FavoriteButton } from "./favorite-button";
import { GalleryCover } from "./gallery-cover";
import { GalleryHeader, HeaderAction } from "./gallery-header";
import { IdentityDialog } from "./identity-dialog";
import { Lightbox } from "./lightbox";
import { LoadMoreSentinel, PhotoLayout } from "./photo-layout";
import { SelectionDialog } from "./selection-dialog";
import { useFavorites } from "./use-favorites";
import { usePhotoPages } from "./use-photo-pages";

async function shareLink(title: string, slug: string) {
  const url = `${window.location.origin}/g/${slug}`;
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

type Props = { view: PublicGalleryView; favoriteIds: string[]; initialMode?: "gallery" | "favorites" };

/** Orchestrates the client gallery; access was already decided on the server. */
export function ClientGallery({ view, favoriteIds, initialMode = "gallery" }: Props) {
  const firstId = view.galleries[0]?.id;
  const [active, setActive] = useState<string | undefined>(firstId);
  const [mode, setMode] = useState(initialMode);
  const [lightbox, setLightbox] = useState<{ index: number; playing: boolean } | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const { pages, ensure, loadMore } = usePhotoPages(view.slug, view.preview, firstId, view.firstPage);
  const fav = useFavorites(view.slug, favoriteIds, view.visitor.selectionClosed);
  const main = useRef<HTMLElement>(null);
  const [identity, setIdentity] = useState({ name: view.visitor.name, email: view.visitor.email });
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  /** Galleries that ask for name and e-mail: run the action now, or after the visitor identifies. */
  const needsIdentity = view.features.requireIdentity && !view.preview && !identity.email;
  function withIdentity(action: () => void) {
    if (needsIdentity) setPendingAction(() => action);
    else action();
  }

  // Hearts are for the client; the photographer's preview never creates sessions.
  const canFavorite = view.features.favorites && !view.preview;
  const canZip = view.features.fullDownload && !view.preview;
  const totalPhotos = view.galleries.reduce((sum, g) => sum + g.count, 0);
  const showingFavorites = mode === "favorites" && canFavorite;

  const current = active ? pages[active] : undefined;
  const photos: PublicPhoto[] = showingFavorites ? (fav.list ?? []) : (current?.photos ?? []);
  const total = showingFavorites ? photos.length : (view.galleries.find((g) => g.id === active)?.count ?? photos.length);
  const more = useCallback(() => {
    if (!showingFavorites && active) loadMore(active);
  }, [active, loadMore, showingFavorites]);
  const share = () => void shareLink(view.title, view.slug);

  const { list: favList, loadList } = fav;
  useEffect(() => {
    if (showingFavorites && favList === null) void loadList();
  }, [showingFavorites, favList, loadList]);

  function enter() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    main.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  function openFavorites(on: boolean) {
    setMode(on ? "favorites" : "gallery");
    setLightbox(null);
    window.history.replaceState(null, "", on ? `/g/${view.slug}/favorites` : `/g/${view.slug}`);
    if (on) main.current?.scrollIntoView({ behavior: "auto" });
  }

  const heart = (photo: PublicPhoto) =>
    canFavorite ? <FavoriteButton active={fav.ids.has(photo.id)} filename={photo.filename} onToggle={() => withIdentity(() => void fav.toggle(photo))} /> : null;

  return (
    <>
      {view.preview ? (
        <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-accent px-3 py-1.5 text-center text-[11.5px] font-medium text-white">
          <Eye className="size-3.5 shrink-0" /> Pré-visualização do fotógrafo — o cliente vê esta página somente após a publicação
        </div>
      ) : null}

      {initialMode === "gallery" ? (
        <GalleryCover
          title={view.title}
          eventDate={view.eventDate}
          coverUrl={view.coverUrl}
          coverColor={view.coverColor}
          canShare={view.features.share}
          onEnter={enter}
          onShare={share}
        />
      ) : null}

      <main ref={main} className="min-h-dvh bg-background">
        <GalleryHeader
          title={view.title}
          eventDate={view.eventDate}
          canShare={view.features.share}
          onShare={share}
          onSlideshow={() => photos.length && setLightbox({ index: 0, playing: true })}
        >
          {canFavorite ? <HeaderAction icon={Heart} label="Favoritos" onClick={() => openFavorites(!showingFavorites)} active={showingFavorites} badge={fav.count} /> : null}
          {canZip ? <HeaderAction icon={Download} label="Baixar" onClick={() => withIdentity(() => setArchiveOpen(true))} /> : null}
        </GalleryHeader>

        <div className="mx-auto max-w-[1800px] px-1.5 pb-24 sm:px-8">
          {showingFavorites ? (
            <div className="flex flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <button type="button" onClick={() => openFavorites(false)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-3.5" /> Voltar para a galeria
              </button>
              <div>
                <h2 className="font-serif text-3xl">Seus favoritos</h2>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {fav.closed
                    ? "Seleção enviada ao fotógrafo. Para mudar, peça a ele para reabri-la."
                    : fav.count === 0
                      ? "Toque no coração das fotos que você mais gostou."
                      : `${fav.count} ${fav.count === 1 ? "foto marcada" : "fotos marcadas"}`}
                </p>
              </div>
              {fav.closed ? (
                <Button variant="outline" disabled>
                  <Check /> Seleção enviada
                </Button>
              ) : (
                <Button onClick={() => setSelectionOpen(true)} disabled={fav.count === 0}>
                  <Send /> Enviar seleção
                </Button>
              )}
            </div>
          ) : view.galleries.length > 1 ? (
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

          {photos.length === 0 && !(showingFavorites ? fav.loadingList || fav.list === null : current?.loading) ? (
            <p className="py-32 text-center font-serif text-2xl italic text-muted-foreground">
              {showingFavorites ? "Nenhuma foto marcada ainda." : view.galleries.length === 0 ? "As fotos estarão aqui em breve." : "Nenhuma foto nesta galeria."}
            </p>
          ) : (
            <PhotoLayout layout={view.layout} photos={photos} onOpen={(index) => setLightbox({ index, playing: false })} renderOverlay={heart} />
          )}

          {!showingFavorites ? (
            <>
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
            </>
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
          onShortcut={(key, photo) => key === "f" && canFavorite && withIdentity(() => void fav.toggle(photo))}
          actions={(photo) => (
            <>
              {view.features.download || view.preview ? (
                <a
                  href={`/g/${view.slug}/api/photos/${photo.id}/download${view.preview ? "?preview=1" : ""}`}
                  onClick={(e) => {
                    if (!needsIdentity) return;
                    e.preventDefault();
                    const href = e.currentTarget.href;
                    withIdentity(() => window.location.assign(href));
                  }}
                  aria-label="Baixar esta foto"
                  title="Baixar esta foto"
                  className="grid size-11 place-items-center rounded-[4px] text-white/75 transition-colors hover:text-white active:scale-90"
                >
                  <Download strokeWidth={1.4} className="size-5" />
                </a>
              ) : null}
              {canFavorite ? (
              <button
                type="button"
                onClick={() => withIdentity(() => void fav.toggle(photo))}
                aria-pressed={fav.ids.has(photo.id)}
                aria-label={fav.ids.has(photo.id) ? "Remover dos favoritos (F)" : "Favoritar (F)"}
                title="Favoritar (F)"
                className="grid size-11 place-items-center rounded-[4px] text-white/75 transition-colors hover:text-white active:scale-90"
              >
                <Heart strokeWidth={1.4} className={cn("size-5", fav.ids.has(photo.id) && "fill-white text-white")} />
              </button>
              ) : null}
            </>
          )}
        />
      ) : null}

      {canFavorite ? (
        <SelectionDialog
          open={selectionOpen}
          onOpenChange={setSelectionOpen}
          slug={view.slug}
          count={fav.count}
          initialName={identity.name}
          initialEmail={identity.email}
          onSubmitted={fav.close}
        />
      ) : null}

      {view.features.requireIdentity && !view.preview ? (
        <IdentityDialog
          open={pendingAction !== null}
          onOpenChange={(open) => !open && setPendingAction(null)}
          slug={view.slug}
          studio={view.studio.name}
          onIdentified={(id) => {
            setIdentity(id);
            const run = pendingAction;
            setPendingAction(null);
            run?.();
          }}
        />
      ) : null}

      {canZip ? (
        <ArchiveDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          description="Preparamos um arquivo ZIP com as fotos. Galerias grandes são divididas em partes."
          options={[
            { value: "all", label: "Todas as fotos", count: totalPhotos },
            ...(canFavorite ? [{ value: "favorites", label: "Somente favoritas", count: fav.count }] : []),
          ]}
          createRequest={(scope) => ({ url: `/g/${view.slug}/api/archives`, body: { scope } })}
          statusUrl={(id) => `/g/${view.slug}/api/archives/${id}`}
          partUrl={(id, index) => `/g/${view.slug}/api/archives/${id}/parts/${index}`}
        />
      ) : null}
    </>
  );
}
