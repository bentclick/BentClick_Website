import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/http/cron";
import { expireCollections } from "@/services/maintenance/maintenance.service";

/** Daily: persist expiry for published galleries past their date. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ expired: await expireCollections() });
}
