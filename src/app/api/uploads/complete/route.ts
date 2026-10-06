import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { completeRequestSchema } from "@/lib/validation/upload";
import { completeUploads } from "@/services/photos/upload.service";

/** Confirm finished uploads; each object is verified in storage before it counts. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const { photoIds } = await readJson(request, completeRequestSchema);
    return NextResponse.json(await completeUploads(user.id, photoIds));
  } catch (error) {
    return errorResponse(error);
  }
}
