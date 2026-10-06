import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { portfolioResignSchema } from "@/lib/validation/portfolio";
import { resignPortfolioUpload } from "@/services/portfolio/portfolio-upload.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const { imageId } = await readJson(request, portfolioResignSchema);
    return NextResponse.json(await resignPortfolioUpload(user.id, imageId));
  } catch (error) {
    return errorResponse(error);
  }
}
