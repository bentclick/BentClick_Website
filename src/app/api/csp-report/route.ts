import { NextResponse } from "next/server";
import { summarizeCspReport } from "@/lib/security/csp";
import { clientIpHash } from "@/lib/security/client-ip";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const MAX_BYTES = 8 * 1024;
const done = () => new NextResponse(null, { status: 204 });

/** Browsers post blocked items here. Public by nature: size is checked before reading, and it always answers 204. */
export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length"));
  if (!size || size > MAX_BYTES) return done();
  try {
    if (!(await consumeRateLimit(`csp-report:${await clientIpHash()}`, 30, 3600))) return done();
    const report = summarizeCspReport(await request.text());
    if (report) console.warn("[csp]", report);
  } catch (error) {
    console.error("[csp] report failed", error);
  }
  return done();
}
