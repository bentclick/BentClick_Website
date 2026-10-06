"use client";

import { useEffect, useRef, useState } from "react";
import type { GalleryLayout } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils/cn";
import type { PublicPhoto } from "@/types/public-gallery";

function useColumns() {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const pick = () => {
      const w = window.innerWidth;
      setCount(w < 640 ? 2 : w < 1024 ? 3 : w < 1700 ? 4 : 5);
    };
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);
  return count;
}

type TileProps = { photo: PublicPhoto; index: number; sizes: string; crop?: boolean; onOpen: (index: number) => void; overlay?: React.ReactNode };

function Tile({ photo, index, sizes, crop, onOpen, overlay }: TileProps) {
  return (
    <div className={cn("group relative overflow-hidden", crop && "size-full")} style={{ backgroundColor: photo.color ?? "var(--subtle)" }}>
      <button type="button" onClick={() => onOpen(index)} aria-label={`Abrir ${photo.filename}`} className="block size-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs; must not proxy through Vercel */}
        <img
          src={photo.thumbUrl}
          srcSet={`${photo.thumbUrl} 600w, ${photo.previewUrl} 2048w`}
          sizes={sizes}
          alt={photo.filename}
          width={photo.width}
          height={photo.height}
          loading={index < 8 ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "block w-full transition-[transform,filter] duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.015] [@media(hover:hover)]:group-hover:brightness-[0.92]",
            crop ? "size-full object-cover" : "h-auto",
          )}
        />
      </button>
      {overlay}
    </div>
  );
}

type Props = {
  layout: GalleryLayout;
  photos: PublicPhoto[];
  onOpen: (index: number) => void;
  renderOverlay?: (photo: PublicPhoto) => React.ReactNode;
};

/** Natural aspect ratios, hairline gutters, no cards — the photographs are the page. */
export function PhotoLayout({ layout, photos, onOpen, renderOverlay }: Props) {
  const columns = useColumns();
  const sizes = `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${Math.round(100 / columns)}vw`;

  if (layout === "GRID") {
    return (
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {photos.map((p, i) => (
          <li key={p.id} className="aspect-square">
            <Tile photo={p} index={i} sizes={sizes} crop onOpen={onOpen} overlay={renderOverlay?.(p)} />
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "EDITORIAL") {
    const pattern = columns <= 2 ? [1, 2] : [1, 2, 3, 2];
    const rows: { p: PublicPhoto; i: number }[][] = [];
    for (let i = 0, r = 0; i < photos.length; r++) {
      const n = pattern[r % pattern.length]!;
      rows.push(photos.slice(i, i + n).map((p, k) => ({ p, i: i + k })));
      i += n;
    }
    return (
      <div className="flex flex-col gap-1.5">
        {rows.map((row, r) => (
          <div key={r} className={row.length === 1 ? "mx-auto flex w-full max-w-[1100px]" : "flex gap-1.5"}>
            {row.map(({ p, i }) => (
              <div key={p.id} className="min-w-0" style={{ flex: `${p.width / p.height} 1 0%`, aspectRatio: `${p.width / p.height}` }}>
                <Tile photo={p} index={i} sizes={row.length === 1 ? "100vw" : `${Math.round(100 / row.length)}vw`} crop onOpen={onOpen} overlay={renderOverlay?.(p)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Masonry: shortest-column placement keeps reading order roughly left → right.
  const cols: { p: PublicPhoto; i: number }[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  photos.forEach((p, i) => {
    const target = heights.indexOf(Math.min(...heights));
    cols[target]!.push({ p, i });
    heights[target]! += p.height / p.width;
  });
  return (
    <div className="flex gap-1.5">
      {cols.map((col, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-1.5">
          {col.map(({ p, i }) => (
            <Tile key={p.id} photo={p} index={i} sizes={sizes} onOpen={onOpen} overlay={renderOverlay?.(p)} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Invisible marker that asks for the next page as it approaches the viewport. */
export function LoadMoreSentinel({ onVisible, active }: { onVisible: () => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && onVisible(), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, active]);
  return <div ref={ref} aria-hidden className="h-px" />;
}
