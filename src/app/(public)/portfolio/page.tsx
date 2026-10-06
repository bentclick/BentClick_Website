import type { Metadata } from "next";
import { CategoryFilter } from "@/components/site/category-filter";
import { PhotoMasonry } from "@/components/site/photo-masonry";
import { categoryFromSlug } from "@/lib/constants/portfolio";
import { getPortfolioImages } from "@/services/site/site.service";

export const metadata: Metadata = {
  title: "Portfólio",
  description: "Casamentos, eventos, ensaios, pessoas, corporativo, viagens e produtos.",
};

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const category = categoryFromSlug(categoria);
  const images = await getPortfolioImages(category);

  return (
    <main className="mx-auto max-w-[1600px] px-5 pb-24 pt-14 sm:px-10 sm:pt-20">
      <h1 className="text-center font-serif text-[13px] font-medium uppercase tracking-[0.5em] text-muted-foreground">
        Portfólio
      </h1>
      <div className="mt-8">
        <CategoryFilter activeSlug={category ? (categoria ?? null) : null} />
      </div>

      {images.length > 0 ? (
        <PhotoMasonry images={images} className="mt-10" />
      ) : (
        <p className="py-32 text-center font-serif text-2xl italic text-muted-foreground">
          {category ? "Nenhum trabalho publicado nesta categoria ainda." : "Portfólio em breve."}
        </p>
      )}
    </main>
  );
}
