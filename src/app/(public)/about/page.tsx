import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/brand/monogram";
import { getSiteProfile } from "@/services/site/site.service";

export const metadata: Metadata = { title: "Sobre" };
export const revalidate = 600;

export default async function AboutPage() {
  const profile = await getSiteProfile();
  const paragraphs = profile?.bio?.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <main className="mx-auto grid max-w-[1200px] gap-16 px-5 py-20 sm:px-10 sm:py-28 lg:grid-cols-[1fr_1.3fr] lg:items-center">
      <Monogram className="mx-auto h-56 text-taupe sm:h-72 lg:h-96" />
      <div>
        <p className="eyebrow">Sobre</p>
        <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.05] sm:text-6xl">{profile?.name ?? "BentClick Fotografia"}</h1>
        {profile?.tagline ? <p className="mt-4 font-serif text-xl italic text-muted-foreground">{profile.tagline}</p> : null}
        <div className="mt-8 grid max-w-xl gap-5 text-[15px] leading-relaxed text-foreground/80">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>
              Fotografia de pessoas, histórias e momentos que merecem ser lembrados — de casamentos e eventos a retratos,
              ensaios, trabalhos corporativos, produtos e viagens.
            </p>
          )}
        </div>
        <Link
          href="/contact"
          className="caps mt-10 inline-flex h-12 items-center rounded-[4px] bg-accent px-7 text-[11px] tracking-[0.18em] text-white transition-colors duration-200 hover:bg-accent-hover"
        >
          Fale comigo
        </Link>
      </div>
    </main>
  );
}
