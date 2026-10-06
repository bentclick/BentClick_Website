"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PublicImage } from "@/types/site";

const INTERVAL_MS = 7000;

/** Slow crossfade between up to three album covers, with a "01 — 03" indicator. */
export function HeroCarousel({ images }: { images: PublicImage[] }) {
  const [index, setIndex] = useState(0);
  const count = images.length;

  useEffect(() => {
    if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(id);
  }, [count]);

  return (
    <>
      {images.map((image, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL; bytes must not proxy through Vercel
        <img
          key={image.id}
          src={image.src}
          alt={i === index ? image.alt : ""}
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-[1600ms] ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {count > 1 ? (
        <div className="absolute bottom-10 right-5 z-10 flex items-center gap-4 text-[11px] tabular-nums tracking-[0.2em] text-white/85 sm:right-10">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span aria-hidden className="relative h-px w-24 bg-white/30">
            <span
              className="absolute inset-y-0 left-0 bg-white transition-[width] duration-700"
              style={{ width: `${((index + 1) / count) * 100}%` }}
            />
          </span>
          <span>{String(count).padStart(2, "0")}</span>
        </div>
      ) : null}
    </>
  );
}
