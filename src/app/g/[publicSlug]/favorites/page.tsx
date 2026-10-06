import type { Metadata } from "next";
import { renderClientGallery } from "../_render";

export const metadata: Metadata = { title: "Favoritos" };

export default async function ClientFavoritesPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  return renderClientGallery((await params).publicSlug, { preview: false, mode: "favorites" });
}
