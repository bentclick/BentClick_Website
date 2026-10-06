import { after, NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { processArchive } from "@/services/downloads/archive.service";
import { visitorArchiveStatus } from "@/services/downloads/visitor-download.service";

export const maxDuration = 300;

/** Poll endpoint; each poll also resumes packing if a previous worker stopped. */
export async function GET(_request: Request, { params }: { params: Promise<{ publicSlug: string; jobId: string }> }) {
  try {
    const { publicSlug, jobId } = await params;
    const state = await visitorArchiveStatus(publicSlug, idSchema.parse(jobId));
    if (state.needsWork) after(() => processArchive(state.status.id));
    return NextResponse.json(state.status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
