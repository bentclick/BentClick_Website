import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { portfolioCompleteSchema } from "@/lib/validation/portfolio";
import { completePortfolioUploads } from "@/services/portfolio/portfolio-upload.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const { imageIds } = await readJson(request, portfolioCompleteSchema);
    return NextResponse.json(await completePortfolioUploads(user.id, imageIds));
  } catch (error) {
    return errorResponse(error);
  }
}
