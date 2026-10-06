import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { resignRequestSchema } from "@/lib/validation/upload";
import { resignUpload } from "@/services/photos/upload.service";

/** New presigned URL for retrying a single failed upload. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const { photoId } = await readJson(request, resignRequestSchema);
    return NextResponse.json(await resignUpload(user.id, photoId));
  } catch (error) {
    return errorResponse(error);
  }
}
