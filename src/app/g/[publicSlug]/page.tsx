import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientGallery } from "@/components/gallery/client-gallery";
import { GalleryNotice } from "@/components/gallery/gallery-notice";
import { accentVars } from "@/lib/utils/color";
import { buildGalleryView, resolveGallery } from "@/services/public-gallery/public-gallery.service";

type Props = { params: Promise<{ publicSlug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await resolveGallery((await params).publicSlug);
  // Only reveal the title once the visitor is actually allowed in.
  return { title: resolved?.decision.kind === "GRANTED" ? resolved.collection.title : "Galeria" };
}

export default async function ClientGalleryPage({ params, searchParams }: Props) {
  const [{ publicSlug }, { preview }] = await Promise.all([params, searchParams]);
  const resolved = await resolveGallery(publicSlug, { preview: preview === "1" });
  if (!resolved || resolved.decision.kind === "NOT_FOUND") notFound();

  const studio = resolved.collection.user.profile?.brandName ?? resolved.collection.user.name;
  if (resolved.decision.kind === "EXPIRED") {
    return (
      <GalleryNotice
        title="Esta galeria não está mais disponível."
        message="O prazo de acesso terminou. Se precisar das fotos, fale com o fotógrafo — os arquivos continuam guardados."
        studio={studio}
      />
    );
  }
  if (resolved.decision.kind === "NEEDS_PASSWORD") redirect(`/g/${publicSlug}/access`);

  const view = await buildGalleryView(resolved);
  return (
    <div style={accentVars(view.studio.accent) as React.CSSProperties}>
      <ClientGallery view={view} />
    </div>
  );
}
