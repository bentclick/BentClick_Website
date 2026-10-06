import { redirect } from "next/navigation";

// The overview (activity + recent collections) arrives with Phase 10 analytics.
export default function DashboardIndex() {
  redirect("/dashboard/collections");
}
