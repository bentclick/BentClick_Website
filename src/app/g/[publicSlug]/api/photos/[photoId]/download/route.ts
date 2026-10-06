import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { visitorPhotoDownloadUrl } from "@/services/downloads/visitor-download.service";

// May render a high-res copy on first request.
export const maxDuration = 60;

/** Validates access, logs the download, then redirects to a 10-minute signed URL. */
export async function GET(request: Request, { params }: { params: Promise<{ publicSlug: string; photoId: string }> }) {
  try {
    const { publicSlug, photoId } = await params;
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    const url = await visitorPhotoDownloadUrl(publicSlug, idSchema.parse(photoId), preview);
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
