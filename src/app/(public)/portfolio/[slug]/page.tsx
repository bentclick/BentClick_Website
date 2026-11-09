import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoMasonry } from "@/components/site/photo-masonry";
import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";
import { getPublicAlbum } from "@/services/site/site.service";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const album = await getPublicAlbum((await params).slug);
  return album ? { title: album.title, description: album.description ?? undefined } : { title: "Portfólio" };
}

/** One published work, on its own page. */
export default async function AlbumPage({ params }: Props) {
  const album = await getPublicAlbum((await params).slug);
  if (!album) notFound();
  const category = PORTFOLIO_CATEGORIES.find((c) => c.value === album.category);

  return (
    <main className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-10 sm:pt-14">
      <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Portfólio
      </Link>
      <header className="mx-auto mt-8 max-w-2xl text-center">
        {category ? <p className="eyebrow">{category.label}</p> : null}
        <h1 className="mt-4 font-serif text-4xl font-normal leading-tight sm:text-5xl">{album.title}</h1>
        {album.description ? <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{album.description}</p> : null}
      </header>
      <PhotoMasonry images={album.images} showCategory={false} className="mt-12" />
    </main>
  );
}
