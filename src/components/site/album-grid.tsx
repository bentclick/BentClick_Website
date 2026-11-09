import Link from "next/link";
import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";
import { pluralize } from "@/lib/utils/format";
import type { PublicAlbum } from "@/types/site";

const LABEL = Object.fromEntries(PORTFOLIO_CATEGORIES.map((c) => [c.value, c.label]));

/** One cover per work; centred so one or two albums don't sit lopsided. */
export function AlbumGrid({ albums, className }: { albums: PublicAlbum[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap justify-center gap-x-6 gap-y-12 ${className ?? ""}`}>
      {albums.map((album, i) => (
        <li key={album.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
          <Link href={`/portfolio/${album.slug}`} className="group block">
            <div className="aspect-[4/5] overflow-hidden bg-subtle" style={album.color ? { backgroundColor: album.color } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL; bytes must not proxy through Vercel */}
              <img
                src={album.coverUrl}
                alt={album.title}
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
                className="size-full object-cover transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.015] group-hover:brightness-[0.92]"
              />
            </div>
            <h2 className="mt-4 font-serif text-2xl font-normal leading-tight">{album.title}</h2>
            <p className="caps mt-1.5 text-[10px] tracking-[0.18em] text-muted-foreground">
              {LABEL[album.category]} · {pluralize(album.imageCount, "foto")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
