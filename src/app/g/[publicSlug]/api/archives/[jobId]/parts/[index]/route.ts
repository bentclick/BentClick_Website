import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { partIndexSchema } from "@/lib/validation/download";
import { visitorArchivePartUrl } from "@/services/downloads/visitor-download.service";

export async function GET(_request: Request, { params }: { params: Promise<{ publicSlug: string; jobId: string; index: string }> }) {
  try {
    const { publicSlug, jobId, index } = await params;
    const url = await visitorArchivePartUrl(publicSlug, idSchema.parse(jobId), partIndexSchema.parse(index));
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
