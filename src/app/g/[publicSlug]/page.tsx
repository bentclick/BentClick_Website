import type { Metadata } from "next";
import { resolveGallery } from "@/services/public-gallery/public-gallery.service";
import { renderClientGallery } from "./_render";

type Props = { params: Promise<{ publicSlug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await resolveGallery((await params).publicSlug);
  // Only reveal the title once the visitor is actually allowed in.
  return { title: resolved?.decision.kind === "GRANTED" ? resolved.collection.title : "Galeria" };
}

export default async function ClientGalleryPage({ params, searchParams }: Props) {
  const [{ publicSlug }, { preview }] = await Promise.all([params, searchParams]);
  return renderClientGallery(publicSlug, { preview: preview === "1", mode: "gallery" });
}
