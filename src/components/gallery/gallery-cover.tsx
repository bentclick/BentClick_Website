"use client";

import { Share2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { formatLongDate } from "@/lib/utils/format";

type Props = {
  title: string;
  eventDate: string | null;
  coverUrl: string | null;
  coverColor: string | null;
  canShare: boolean;
  onEnter: () => void;
  onShare: () => void;
  headerActions?: React.ReactNode;
};

/** Cinematic first screen: the client's name over their own photograph. */
export function GalleryCover({ title, eventDate, coverUrl, coverColor, canShare, onEnter, onShare, headerActions }: Props) {
  return (
    <section className="relative flex h-[100svh] min-h-[520px] flex-col overflow-hidden bg-gallery-dark text-white" style={coverColor ? { backgroundColor: coverColor } : undefined}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={coverUrl} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover animate-fade-in" />
      ) : null}
      <div aria-hidden className="absolute inset-0 bg-black/35" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pt-8">
        <Logo variant="horizontal" size={32} />
        <div className="flex items-center gap-1 sm:gap-3">
          {canShare ? (
            <button type="button" onClick={onShare} className="inline-flex h-10 items-center gap-2 rounded-[4px] px-2.5 text-[12.5px] text-white/90 transition-colors hover:text-white active:scale-[0.97]">
              <Share2 strokeWidth={1.4} className="size-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          ) : null}
          {headerActions}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-[42px] font-normal uppercase leading-none tracking-[0.12em] sm:text-[64px] lg:text-[76px]">{title}</h1>
        {eventDate ? (
          <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.32em] text-white/85">{formatLongDate(eventDate)}</p>
        ) : null}
        <button
          type="button"
          onClick={onEnter}
          className="caps mt-12 inline-flex h-12 items-center rounded-[3px] border border-white/80 px-9 text-[11px] tracking-[0.24em] transition-colors duration-200 hover:bg-white hover:text-foreground active:scale-[0.97]"
        >
          Ver galeria
        </button>
      </div>

      <p className="relative z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[10px] uppercase tracking-[0.3em] text-white/55">
        Fotografia · BentClick
      </p>
    </section>
  );
}
