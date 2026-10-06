import "server-only";
import type { EmailStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { defaultFrom, sendEmail } from "@/lib/email/resend";
import { galleryReadyEmail, selectionSubmittedEmail } from "@/lib/email/templates";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { galleryUrl } from "@/lib/utils/urls";
import { logActivity } from "@/services/activity/activity.repository";
import { DomainError, NotFoundError } from "@/services/errors";

export type EmailLogItem = { id: string; recipient: string; subject: string; status: EmailStatus; error: string | null; createdAt: string };

async function studioOf(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, profile: { select: { brandName: true, accentColor: true, replyToEmail: true } } },
  });
  return {
    name: user.profile?.brandName ?? user.name,
    accent: user.profile?.accentColor ?? "#A27B5C",
    replyTo: user.profile?.replyToEmail ?? user.email,
    ownerEmail: user.email,
  };
}

/** Sends the gallery link to a client and records the attempt (sent / failed). */
export async function sendGalleryEmail(userId: string, input: { collectionId: string; recipient: string; subject: string; message: string }) {
  const collection = await prisma.collection.findFirst({
    where: { id: input.collectionId, userId },
    select: { id: true, title: true, slug: true, status: true, clientId: true, passwordHash: true, linkEnabled: true },
  });
  if (!collection) throw new NotFoundError("Collection");
  if (collection.status !== "PUBLISHED" || !collection.linkEnabled) {
    throw new DomainError("NOT_PUBLISHED", "Publique a galeria (com o link ativo) antes de enviar para o cliente.");
  }
  await enforceRateLimit(`email:${userId}`, 30, 3600);

  const studio = await studioOf(userId);
  const client = await prisma.client.findFirst({ where: { userId, email: input.recipient.toLowerCase() }, select: { id: true } });
  const log = await prisma.emailLog.create({
    data: { userId, collectionId: collection.id, clientId: client?.id ?? collection.clientId, recipient: input.recipient, subject: input.subject },
    select: { id: true },
  });

  const { html, text } = galleryReadyEmail({
    studio: studio.name,
    accent: studio.accent,
    title: collection.title,
    message: input.message,
    url: galleryUrl(collection.slug),
    password: collection.passwordHash !== null,
  });
  const result = await sendEmail({ from: defaultFrom(studio.name), to: input.recipient, subject: input.subject, html, text, replyTo: studio.replyTo });

  if (!result.ok) {
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", error: result.error.slice(0, 500) } });
    throw new DomainError("EMAIL_FAILED", `Não foi possível enviar: ${result.error}`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.emailLog.update({ where: { id: log.id }, data: { status: "SENT", providerMessageId: result.id } });
    await logActivity(tx, { userId, collectionId: collection.id, actorType: "PHOTOGRAPHER", type: "EMAIL_SENT", metadata: { recipient: input.recipient } });
  });
}

export async function listEmailLog(userId: string, collectionId: string): Promise<EmailLogItem[]> {
  const rows = await prisma.emailLog.findMany({
    where: { userId, collectionId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, recipient: true, subject: true, status: true, error: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Best effort: tell the photographer a client submitted a selection. Never blocks the client. */
export async function notifySelectionSubmitted(collectionId: string, clientName: string, clientEmail: string, count: number) {
  try {
    const collection = await prisma.collection.findUnique({ where: { id: collectionId }, select: { id: true, title: true, userId: true } });
    if (!collection) return;
    const studio = await studioOf(collection.userId);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const { html, text } = selectionSubmittedEmail({
      studio: studio.name,
      accent: studio.accent,
      title: collection.title,
      clientName,
      clientEmail,
      count,
      url: `${appUrl}/dashboard/collections/${collection.id}/selections`,
    });
    await sendEmail({ from: defaultFrom(studio.name), to: studio.ownerEmail, subject: `Nova seleção — ${collection.title}`, html, text, replyTo: clientEmail });
  } catch (error) {
    console.error("[email] selection notification failed", error);
  }
}

/** Delivery updates from the Resend webhook. */
export async function applyDeliveryEvent(providerMessageId: string, status: EmailStatus, error?: string) {
  await prisma.emailLog.updateMany({ where: { providerMessageId }, data: { status, ...(error ? { error: error.slice(0, 500) } : {}) } });
}
