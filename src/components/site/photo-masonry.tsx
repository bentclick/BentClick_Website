import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";
import { cn } from "@/lib/utils/cn";
import type { PublicImage } from "@/types/site";

const LABEL = Object.fromEntries(PORTFOLIO_CATEGORIES.map((c) => [c.value, c.label]));

/**
 * Editorial masonry via CSS columns: natural aspect ratios, hairline gutters,
 * no cards or borders. Width/height attributes reserve space before load.
 */
export function PhotoMasonry({ images, className }: { images: PublicImage[]; className?: string }) {
  return (
    <ul className={cn("columns-2 gap-1.5 md:columns-3 xl:columns-4 [&>li]:mb-1.5", className)}>
      {images.map((image, i) => (
        <li key={image.id} className="group relative break-inside-avoid overflow-hidden bg-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL; bytes must not proxy through Vercel */}
          <img
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading={i < 6 ? "eager" : "lazy"}
            decoding="async"
            className="block h-auto w-full transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.015] group-hover:brightness-[0.92]"
          />
          <span className="caps pointer-events-none absolute bottom-3 left-3 text-[10px] tracking-[0.2em] text-white opacity-0 drop-shadow transition-opacity duration-300 group-hover:opacity-100">
            {LABEL[image.category]}
          </span>
        </li>
      ))}
    </ul>
  );
}
