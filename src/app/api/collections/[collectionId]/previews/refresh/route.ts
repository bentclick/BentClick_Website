import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { refreshPreviews } from "@/services/photos/preview-refresh.service";

export const maxDuration = 60;

/** Owner: re-render a slice of outdated previews; the editor calls again until none remain. */
export async function POST(request: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    return NextResponse.json(await refreshPreviews(user.id, idSchema.parse((await params).collectionId)));
  } catch (error) {
    return errorResponse(error);
  }
}
