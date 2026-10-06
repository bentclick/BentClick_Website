import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { photoPage, resolveGallery } from "@/services/public-gallery/public-gallery.service";

/** Next page of photos for infinite scroll. Access is re-evaluated on every call. */
export async function GET(request: Request, { params }: { params: Promise<{ publicSlug: string }> }) {
  try {
    const { publicSlug } = await params;
    const url = new URL(request.url);
    const galleryId = idSchema.parse(url.searchParams.get("gallery"));
    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? idSchema.parse(cursorParam) : undefined;

    const resolved = await resolveGallery(publicSlug, { preview: url.searchParams.get("preview") === "1" });
    if (!resolved || resolved.decision.kind !== "GRANTED") {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }
    const page = await photoPage(resolved.collection.id, galleryId, cursor);
    return NextResponse.json(page, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
