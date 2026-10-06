import { after, NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { processArchive } from "@/services/downloads/archive.service";
import { ownerArchiveStatus } from "@/services/downloads/owner-download.service";

export const maxDuration = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const user = await assertUser();
    const state = await ownerArchiveStatus(user.id, idSchema.parse((await params).jobId));
    if (state.needsWork) after(() => processArchive(state.status.id));
    return NextResponse.json(state.status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
