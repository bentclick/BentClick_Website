import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { presignRequestSchema } from "@/lib/validation/upload";
import { requestUploads } from "@/services/photos/upload.service";

/** Reserve photos and return presigned PUT URLs. No file bytes ever reach this route. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const body = await readJson(request, presignRequestSchema);
    return NextResponse.json(await requestUploads(user.id, body));
  } catch (error) {
    return errorResponse(error);
  }
}
