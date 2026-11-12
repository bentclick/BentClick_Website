import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { duplicateCheckSchema } from "@/lib/validation/upload";
import { findDuplicateUploads } from "@/services/photos/upload.service";

/** Which of these files (name + size) are already in the gallery. Reads only the caller's own gallery. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const body = await readJson(request, duplicateCheckSchema);
    return NextResponse.json(await findDuplicateUploads(user.id, body));
  } catch (error) {
    return errorResponse(error);
  }
}
