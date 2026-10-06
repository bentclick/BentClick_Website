import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse } from "@/lib/http/route-handler";
import { idSchema } from "@/lib/validation/common";
import { processPortfolioImage } from "@/services/portfolio/portfolio-upload.service";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    return NextResponse.json(await processPortfolioImage(user.id, idSchema.parse((await params).imageId)));
  } catch (error) {
    return errorResponse(error);
  }
}
