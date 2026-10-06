import { after, NextResponse } from "next/server";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { visitorArchiveSchema } from "@/lib/validation/download";
import { processArchive } from "@/services/downloads/archive.service";
import { requestVisitorArchive, visitorArchiveStatus } from "@/services/downloads/visitor-download.service";

// Packing continues after the response, within this function's budget.
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ publicSlug: string }> }) {
  try {
    assertSameOrigin(request);
    const { publicSlug } = await params;
    const { scope } = await readJson(request, visitorArchiveSchema);
    const { jobId } = await requestVisitorArchive(publicSlug, scope);
    const state = await visitorArchiveStatus(publicSlug, jobId);
    if (state.needsWork) after(() => processArchive(jobId));
    return NextResponse.json(state.status);
  } catch (error) {
    return errorResponse(error);
  }
}
