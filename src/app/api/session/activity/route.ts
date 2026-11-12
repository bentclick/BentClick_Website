import { NextResponse } from "next/server";
import { requireSessionAllowingSetup, UnauthorizedError } from "@/lib/auth/session";
import { recordActivity } from "@/lib/auth/session-store";
import { assertSameOrigin, errorResponse } from "@/lib/http/route-handler";

/**
 * A gesture in the dashboard (session-policy.ts): renews the 2 h idle clock, at most once a minute from the browser.
 * 401 when the session already ended, so the page sends the person to the login.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSessionAllowingSetup();
    if (!session || !(await recordActivity(session.sessionId))) throw new UnauthorizedError();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
