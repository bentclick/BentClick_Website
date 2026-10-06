import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { ClientGallery } from "@/components/gallery/client-gallery";
import { GalleryNotice } from "@/components/gallery/gallery-notice";
import { accentVars } from "@/lib/utils/color";
import { favoriteIdsFor } from "@/services/favorites/favorites.service";
import { buildGalleryView, recordGalleryView, resolveGallery, visitorKeyFor } from "@/services/public-gallery/public-gallery.service";

/** Shared server render for /g/[slug] and /g/[slug]/favorites. */
export async function renderClientGallery(slug: string, opts: { preview: boolean; mode: "gallery" | "favorites" }) {
  const resolved = await resolveGallery(slug, { preview: opts.preview });
  if (!resolved || resolved.decision.kind === "NOT_FOUND") notFound();

  if (resolved.decision.kind === "EXPIRED") {
    return (
      <GalleryNotice
        title="Esta galeria não está mais disponível."
        message="O prazo de acesso terminou. Se precisar das fotos, fale com o fotógrafo — os arquivos continuam guardados."
        studio={resolved.collection.user.profile?.brandName ?? resolved.collection.user.name}
      />
    );
  }
  if (resolved.decision.kind === "NEEDS_PASSWORD") redirect(`/g/${slug}/access`);

  const [view, favoriteIds, visitor] = await Promise.all([buildGalleryView(resolved), favoriteIdsFor(resolved), visitorKeyFor(resolved)]);
  after(() => recordGalleryView(resolved, visitor).catch((e) => console.error("[analytics] view", e)));
  return (
    <div style={accentVars(view.studio.accent) as React.CSSProperties}>
      <ClientGallery view={view} favoriteIds={favoriteIds} initialMode={opts.mode} />
    </div>
  );
}
