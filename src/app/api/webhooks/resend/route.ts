import { NextResponse } from "next/server";
import type { EmailStatus } from "@/generated/prisma/enums";
import { verifyWebhookSignature } from "@/lib/email/webhook-signature";
import { applyDeliveryEvent } from "@/services/email/email.service";

const STATUS_BY_EVENT: Record<string, EmailStatus> = {
  "email.delivered": "DELIVERED",
  "email.bounced": "BOUNCED",
  "email.complained": "BOUNCED",
  "email.failed": "FAILED",
};

/** Resend delivery events → EmailLog status. Signature-verified; unknown events are acknowledged. */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const body = await request.text();
  const valid = verifyWebhookSignature(
    secret,
    { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") },
    body,
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(body) as { type?: string; data?: { email_id?: string; bounce?: { message?: string } } };
  const status = event.type ? STATUS_BY_EVENT[event.type] : undefined;
  if (status && event.data?.email_id) await applyDeliveryEvent(event.data.email_id, status, event.data.bounce?.message);
  return NextResponse.json({ received: true });
}
