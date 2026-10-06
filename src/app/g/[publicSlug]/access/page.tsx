import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { AccessForm } from "@/components/gallery/access-form";
import { GalleryNotice } from "@/components/gallery/gallery-notice";
import { resolveGallery } from "@/services/public-gallery/public-gallery.service";

export const metadata: Metadata = { title: "Galeria protegida" };

type Props = { params: Promise<{ publicSlug: string }> };

/** Password / PIN gate. Shows no title, date or photo before the visitor is allowed in. */
export default async function GalleryAccessPage({ params }: Props) {
  const { publicSlug } = await params;
  const resolved = await resolveGallery(publicSlug);
  if (!resolved || resolved.decision.kind === "NOT_FOUND") notFound();
  if (resolved.decision.kind === "GRANTED") redirect(`/g/${publicSlug}`);
  if (resolved.decision.kind === "EXPIRED") {
    return (
      <GalleryNotice
        title="Esta galeria não está mais disponível."
        message="O prazo de acesso terminou. Se precisar das fotos, fale com o fotógrafo."
      />
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gallery-dark px-6 text-center text-white">
      <Logo variant="stacked" size={64} />
      <h1 className="mt-14 font-serif text-4xl font-normal sm:text-5xl">Galeria protegida</h1>
      <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/70">Digite a senha enviada junto com o link da sua galeria.</p>
      <AccessForm slug={publicSlug} />
    </main>
  );
}
