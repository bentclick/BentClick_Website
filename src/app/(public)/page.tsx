import Link from "next/link";
import { HomeHero } from "@/components/site/home-hero";
import { PhotoMasonry } from "@/components/site/photo-masonry";
import { getHeroImages, getPortfolioImages } from "@/services/site/site.service";

// Signed display URLs live for ≥ 6 h; re-render well inside that window.
export const revalidate = 600;

const VERSATILITY = ["Casamentos", "Eventos", "Retratos", "Ensaios", "Corporativo", "Produtos", "Viagens"];

export default async function HomePage() {
  const [heroImages, selected] = await Promise.all([getHeroImages(), getPortfolioImages(null, 12)]);

  return (
    <main>
      <HomeHero images={heroImages} />

      <section id="trabalhos" className="mx-auto max-w-[1600px] scroll-mt-20 px-5 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Trabalhos</p>
          <h2 className="mt-5 font-serif text-4xl font-normal leading-tight sm:text-5xl">
            Pessoas, lugares e o que acontece entre eles.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[14px] leading-relaxed text-muted-foreground">{VERSATILITY.join(" · ")}</p>
        </div>

        {selected.length > 0 ? (
          <>
            <PhotoMasonry images={selected} className="mt-16" />
            <div className="mt-14 text-center">
              <Link
                href="/portfolio"
                className="caps inline-flex h-12 items-center rounded-[4px] border border-taupe px-8 text-[11px] tracking-[0.18em] transition-colors duration-200 hover:border-foreground"
              >
                Ver portfólio completo
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-16 text-center font-serif text-2xl italic text-muted-foreground">Portfólio em breve.</p>
        )}
      </section>
    </main>
  );
}
