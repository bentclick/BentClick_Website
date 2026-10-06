import { NextResponse } from "next/server";
import { assertUser } from "@/lib/auth/session";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http/route-handler";
import { portfolioPresignSchema } from "@/lib/validation/portfolio";
import { requestPortfolioUploads } from "@/services/portfolio/portfolio-upload.service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await assertUser();
    const { albumId, files } = await readJson(request, portfolioPresignSchema);
    return NextResponse.json(await requestPortfolioUploads(user.id, albumId, files));
  } catch (error) {
    return errorResponse(error);
  }
}
