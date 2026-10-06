import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

export function getResend(): Resend | null {
  if (client === undefined) client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return client;
}

/** EMAIL_FROM, or galerias@<app domain> (the domain verified in Resend). */
export function defaultFrom(displayName: string): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  const host = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://bentclick.com.br").hostname.replace(/^www\./, "");
  return `${displayName.replace(/[<>"]/g, "")} <galerias@${host}>`;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(message: { from: string; to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "O envio de e-mails ainda não está configurado (RESEND_API_KEY)." };
  try {
    const { data, error } = await resend.emails.send(message);
    if (error || !data) return { ok: false, error: error?.message ?? "Falha no envio" };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha no envio" };
  }
}
