import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Monogram } from "@/components/brand/monogram";
import type { SiteContent } from "@/lib/validation/site-content";
import type { PublicImage } from "@/types/site";
import { HeroCarousel } from "./hero-carousel";

type Props = { images: PublicImage[]; hero: SiteContent["hero"] };

/**
 * Full-bleed photographic hero; every word, the photos and the scrim strength
 * come from the editable site content. Without photos: a quiet dark field.
 */
export function HomeHero({ images, hero }: Props) {
  const lines = hero.title.split("\n").filter(Boolean);

  return (
    <section id="abertura" className="relative flex min-h-[100svh] items-end overflow-hidden bg-gallery-dark text-white sm:items-center">
      {images.length > 0 ? (
        <HeroCarousel images={images} />
      ) : (
        <Monogram className="absolute -right-[8vw] top-1/2 h-[95vh] -translate-y-1/2 text-white/[0.04]" />
      )}
      {/* Directional scrim: dark where the type sits, photograph stays clear on the right. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `linear-gradient(to right, rgb(0 0 0 / ${hero.overlay + 0.2}), rgb(0 0 0 / ${hero.overlay * 0.6}) 50%, rgb(0 0 0 / 0.05))` }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-5 pb-28 pt-32 sm:px-10 sm:pb-0 sm:pt-0">
        <h1 className="font-serif text-[52px] font-normal leading-[0.98] tracking-[-0.01em] sm:text-[84px] lg:text-[104px]">
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
        {hero.subtitle ? <p className="mt-7 max-w-sm text-[15px] leading-relaxed text-white/85">{hero.subtitle}</p> : null}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/portfolio"
            className="caps inline-flex h-12 items-center rounded-[4px] bg-accent px-7 text-[11px] tracking-[0.18em] text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            {hero.primaryLabel}
          </Link>
          {hero.showSecondary ? (
            <Link
              href="/cliente"
              className="caps inline-flex h-12 items-center rounded-[4px] border border-white/70 px-7 text-[11px] tracking-[0.18em] text-white transition-colors duration-200 hover:bg-white hover:text-foreground lg:hidden"
            >
              {hero.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <a
        href="#trabalhos"
        aria-label="Rolar para baixo"
        className="absolute bottom-8 left-1/2 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full border border-white/50 text-white/80 transition-colors hover:border-white hover:text-white"
      >
        <ChevronDown strokeWidth={1.4} className="size-4" />
      </a>
    </section>
  );
}
