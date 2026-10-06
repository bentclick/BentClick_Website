"use client";

import { Play, Share2 } from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { cn } from "@/lib/utils/cn";
import { formatLongDate } from "@/lib/utils/format";

export function HeaderAction({
  icon: Icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={badge ? `${label} (${badge})` : label}
      className={cn(
        "relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-[4px] px-2.5 text-[12.5px] text-foreground/80 transition-colors hover:text-foreground active:scale-[0.97] md:h-9 md:min-w-0",
        active && "text-accent hover:text-accent-hover",
      )}
    >
      <Icon strokeWidth={1.4} className={cn("size-[18px] md:size-4", active && "fill-current")} />
      <span className="hidden lg:inline">{label}</span>
      {badge ? <span className="text-[11.5px] tabular-nums">({badge})</span> : null}
    </button>
  );
}

type Props = {
  title: string;
  eventDate: string | null;
  canShare: boolean;
  onShare: () => void;
  onSlideshow: () => void;
  /** Favourites / download controls from later phases. */
  children?: React.ReactNode;
};

/** Sticky and minimal: whose gallery on the left, the client's tools on the right. */
export function GalleryHeader({ title, eventDate, canShare, onShare, onSlideshow, children }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-4 px-4 sm:px-8">
        <Monogram className="hidden h-8 text-foreground sm:block" />
        <span aria-hidden className="hidden h-7 w-px bg-border sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[19px] font-medium uppercase leading-tight tracking-[0.1em]">{title}</p>
          {eventDate ? <p className="truncate text-[11px] text-muted-foreground">{formatLongDate(eventDate)}</p> : null}
        </div>
        <nav aria-label="Ações da galeria" className="flex items-center">
          {children}
          {canShare ? <HeaderAction icon={Share2} label="Compartilhar" onClick={onShare} /> : null}
          <HeaderAction icon={Play} label="Apresentação" onClick={onSlideshow} />
        </nav>
      </div>
    </header>
  );
}
