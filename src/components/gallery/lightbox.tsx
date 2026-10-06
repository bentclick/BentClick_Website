"use client";

import { ChevronLeft, ChevronRight, Pause, Play, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";
import type { PublicPhoto } from "@/types/public-gallery";

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 0.11; // px/ms — a quick flick is enough
const SLIDE_MS = 4000;

type Props = {
  photos: PublicPhoto[];
  index: number;
  total: number;
  playing: boolean;
  onIndex: (index: number) => void;
  onClose: () => void;
  onTogglePlay: () => void;
  onNeedMore: () => void;
  onShare?: () => void;
  /** Extra controls (favourite, download) injected by later phases. */
  actions?: (photo: PublicPhoto) => React.ReactNode;
};

function IconButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn("grid size-11 place-items-center rounded-[4px] text-white/75 transition-colors hover:text-white active:scale-[0.97]", active && "text-white")}
    >
      {children}
    </button>
  );
}

/** Full-screen viewer: keyboard (← → Esc), swipe with momentum, slideshow, neighbours preloaded. */
export function Lightbox({ photos, index, total, playing, onIndex, onClose, onTogglePlay, onNeedMore, onShare, actions }: Props) {
  const photo = photos[index];
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const drag = useRef<{ x: number; t: number; id: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const last = photos.length - 1;

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next > last) {
        onNeedMore();
        if (photos.length < total) return; // wait for the next page
        onIndex(0);
        return;
      }
      onIndex(next < 0 ? last : next);
    },
    [index, last, onIndex, onNeedMore, photos.length, total],
  );

  useEffect(() => {
    if (index >= last - 5) onNeedMore();
  }, [index, last, onNeedMore]);

  // Keyboard navigation is instant — no transition on arrow presses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(id);
  }, [playing, index, go]);

  // Preload neighbours so a swipe never lands on an empty frame.
  useEffect(() => {
    for (const p of [photos[index + 1], photos[index - 1]]) if (p) new Image().src = p.previewUrl;
  }, [index, photos]);

  if (!photo) return null;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current || e.pointerType === "mouse") return; // one finger only; mouse uses arrows
    drag.current = { x: e.clientX, t: performance.now(), id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSettling(false);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x);
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (d?.id !== e.pointerId) return;
    drag.current = null;
    const distance = e.clientX - d.x;
    const velocity = Math.abs(distance) / Math.max(1, performance.now() - d.t);
    setSettling(true);
    setDx(0);
    if (Math.abs(distance) > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) go(distance < 0 ? 1 : -1);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Foto ${index + 1} de ${total}`} className="fixed inset-0 z-[60] flex flex-col bg-[#0c0c0c] text-white animate-fade-in">
      <header className="flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6">
        <span className="hidden text-white/90 sm:block">
          <Logo variant="horizontal" size={26} />
        </span>
        <p className="pl-2 text-[12px] tabular-nums text-white/55 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:pl-0">
          {index + 1} / {total}
        </p>
        <div className="flex items-center">
          {actions?.(photo)}
          {onShare ? (
            <IconButton label="Compartilhar" onClick={onShare}>
              <Share2 strokeWidth={1.4} className="size-5" />
            </IconButton>
          ) : null}
          <IconButton label={playing ? "Pausar apresentação" : "Apresentação"} onClick={onTogglePlay} active={playing}>
            {playing ? <Pause strokeWidth={1.4} className="size-5" /> : <Play strokeWidth={1.4} className="size-5" />}
          </IconButton>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar (Esc)" className="grid size-11 place-items-center rounded-[4px] text-white/75 hover:text-white">
            <X strokeWidth={1.4} className="size-6" />
          </button>
        </div>
      </header>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y select-none items-center justify-center px-2 py-3 sm:px-20 sm:py-6"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img
          key={photo.id}
          src={loaded === photo.id ? photo.previewUrl : photo.thumbUrl}
          alt={photo.filename}
          draggable={false}
          onLoad={() => {
            // Progressive: show the cached thumbnail, then swap in the full preview.
            if (loaded !== photo.id) {
              const full = new Image();
              full.onload = () => setLoaded(photo.id);
              full.src = photo.previewUrl;
            }
          }}
          className={cn("max-h-full max-w-full object-contain", settling && "transition-transform duration-200 ease-out")}
          style={{ transform: `translateX(${dx}px)`, aspectRatio: `${photo.width} / ${photo.height}` }}
        />
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Foto anterior (←)"
          className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:grid"
        >
          <ChevronLeft strokeWidth={1.2} className="size-7" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Próxima foto (→)"
          className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:grid"
        >
          <ChevronRight strokeWidth={1.2} className="size-7" />
        </button>
      </div>

      {playing ? (
        <div aria-hidden className="h-px bg-white/10">
          <div key={index} className="h-px origin-left bg-white/70" style={{ animation: `bc-progress ${SLIDE_MS}ms linear forwards` }} />
        </div>
      ) : null}
      <p className="pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] text-white/40 sm:hidden">Deslize para navegar</p>
    </div>
  );
}
