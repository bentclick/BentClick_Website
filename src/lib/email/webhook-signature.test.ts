import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./webhook-signature";

const secretBytes = Buffer.from("bentclick-test-webhook-secret");
const secret = `whsec_${secretBytes.toString("base64")}`;
const body = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });
const now = 1_790_000_000;

function sign(id: string, ts: number, payload: string) {
  return `v1,${createHmac("sha256", secretBytes).update(`${id}.${ts}.${payload}`).digest("base64")}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(secret, { id: "msg_1", timestamp: String(now), signature: sign("msg_1", now, body) }, body, now)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(secret, { id: "msg_1", timestamp: String(now), signature: sign("msg_1", now, body) }, `${body} `, now)).toBe(false);
  });

  it("rejects stale timestamps (replay)", () => {
    const old = now - 3600;
    expect(verifyWebhookSignature(secret, { id: "msg_1", timestamp: String(old), signature: sign("msg_1", old, body) }, body, now)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(verifyWebhookSignature(secret, { id: null, timestamp: String(now), signature: "v1,x" }, body, now)).toBe(false);
  });
});
