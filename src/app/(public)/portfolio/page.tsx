import type { Metadata } from "next";
import { AlbumGrid } from "@/components/site/album-grid";
import { CategoryFilter } from "@/components/site/category-filter";
import { PhotoMasonry } from "@/components/site/photo-masonry";
import { categoryFromSlug } from "@/lib/constants/portfolio";
import { getPortfolioImages, getPublicAlbums, getSite } from "@/services/site/site.service";

export const metadata: Metadata = {
  title: "Portfólio",
  description: "Casamentos, eventos, ensaios, pessoas, corporativo, viagens e produtos.",
};

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const category = categoryFromSlug(categoria);
  const { content } = await getSite();
  const { heading, text, view } = content.portfolio;
  const [albums, images] = await Promise.all([view === "albums" ? getPublicAlbums(category) : [], view === "photos" ? getPortfolioImages(category) : []]);
  const empty = albums.length === 0 && images.length === 0;

  return (
    <main className="mx-auto max-w-[1600px] px-5 pb-24 pt-14 sm:px-10 sm:pt-20">
      <h1 className="text-center font-serif text-[13px] font-medium uppercase tracking-[0.5em] text-muted-foreground">{heading}</h1>
      {text ? <p className="mx-auto mt-5 max-w-xl text-center text-[15px] leading-relaxed text-muted-foreground">{text}</p> : null}
      <div className="mt-8">
        <CategoryFilter activeSlug={category ? (categoria ?? null) : null} />
      </div>

      {empty ? (
        <p className="py-32 text-center font-serif text-2xl italic text-muted-foreground">{category ? "Nenhum trabalho publicado nesta categoria ainda." : "Portfólio em breve."}</p>
      ) : view === "albums" ? (
        <AlbumGrid albums={albums} className="mt-12" />
      ) : (
        <PhotoMasonry images={images} className="mt-10" />
      )}
    </main>
  );
}
