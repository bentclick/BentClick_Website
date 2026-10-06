import { assertUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { exportSelectionFilenames } from "@/services/favorites/selections.service";

/** Owner-only: the client's selection as a plain list of original filenames. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await assertUser();
    const { filename, body } = await exportSelectionFilenames(user.id, idSchema.parse((await params).sessionId));
    return new Response(body, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
