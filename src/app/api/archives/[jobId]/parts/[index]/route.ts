import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { partIndexSchema } from "@/lib/validation/download";
import { ownerArchivePartUrl } from "@/services/downloads/owner-download.service";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string; index: string }> }) {
  try {
    const user = await assertUser();
    const { jobId, index } = await params;
    const url = await ownerArchivePartUrl(user.id, idSchema.parse(jobId), partIndexSchema.parse(index));
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
