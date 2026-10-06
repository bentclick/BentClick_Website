import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { ownerPhotoUrl } from "@/services/downloads/owner-download.service";

/** Owner-only: original file via a short-lived signed URL. */
export async function GET(_request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    const user = await assertUser();
    const url = await ownerPhotoUrl(user.id, idSchema.parse((await params).photoId));
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
