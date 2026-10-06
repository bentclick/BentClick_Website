import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/route-handler";
import { listMyFavorites } from "@/services/favorites/favorites.service";

/** The visitor's favourites across every gallery of this collection. */
export async function GET(_request: Request, { params }: { params: Promise<{ publicSlug: string }> }) {
  try {
    const photos = await listMyFavorites((await params).publicSlug);
    return NextResponse.json({ photos }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
