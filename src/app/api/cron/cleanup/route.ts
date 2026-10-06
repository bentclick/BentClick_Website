import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/http/cron";
import { cleanupPendingUploads, pruneRateLimits, purgeExpiredArchives } from "@/services/maintenance/maintenance.service";

export const maxDuration = 120;

/** Daily: abandoned uploads, expired ZIP archives, stale rate-limit buckets. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [uploads, archives, buckets] = [await cleanupPendingUploads(), await purgeExpiredArchives(), await pruneRateLimits()];
  return NextResponse.json({ uploads, archives, buckets });
}
