import { after, NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { ownerArchiveSchema } from "@/lib/validation/download";
import { processArchive } from "@/services/downloads/archive.service";
import { ownerArchiveStatus, ownerRequestArchive } from "@/services/downloads/owner-download.service";

export const maxDuration = 300;

/** Owner: ZIP of the whole collection or of one client's selection (originals). */
export async function POST(request: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const collectionId = idSchema.parse((await params).collectionId);
    const body = await readJson(request, ownerArchiveSchema);
    const { jobId } = await ownerRequestArchive(user.id, collectionId, body.scope === "all" ? { kind: "all" } : { kind: "selection", sessionId: body.sessionId });
    const state = await ownerArchiveStatus(user.id, jobId);
    if (state.needsWork) after(() => processArchive(jobId));
    return NextResponse.json(state.status);
  } catch (error) {
    return errorResponse(error);
  }
}
