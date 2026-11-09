import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { editPresignSchema } from "@/lib/validation/photo-edit";
import { requestEditUpload, revertToOriginal } from "@/services/photos/photo-edit.service";

// Reverting re-renders the preview from the original.
export const maxDuration = 60;

type Context = { params: Promise<{ photoId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const photoId = idSchema.parse((await params).photoId);
    return NextResponse.json(await requestEditUpload(user.id, photoId, await readJson(request, editPresignSchema)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const photoId = idSchema.parse((await params).photoId);
    return NextResponse.json(await revertToOriginal(user.id, photoId));
  } catch (error) {
    return errorResponse(error);
  }
}
