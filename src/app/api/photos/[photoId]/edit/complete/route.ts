import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { completeEditUpload } from "@/services/photos/photo-edit.service";

// Decoding the edited file and writing two WebP files.
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const photoId = idSchema.parse((await params).photoId);
    return NextResponse.json(await completeEditUpload(user.id, photoId));
  } catch (error) {
    return errorResponse(error);
  }
}
