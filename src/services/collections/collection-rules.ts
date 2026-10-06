import type { CollectionStatus } from "@/generated/prisma/enums";
import type { ExpiryPreset } from "@/lib/constants/collection";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Turns the form's expiry choice into an absolute timestamp.
 * Custom dates expire at the end of that calendar day (UTC).
 */
export function resolveExpiry(preset: ExpiryPreset, customDate: string, now: Date = new Date()): Date | null {
  if (preset === "never") return null;
  if (preset === "custom") return customDate ? new Date(`${customDate}T23:59:59.999Z`) : null;
  return new Date(now.getTime() + Number(preset) * DAY_MS);
}

/**
 * Status as the client experiences it. A PUBLISHED collection past its expiry
 * is EXPIRED even before the cron sweep persists the change.
 */
export function effectiveStatus(status: CollectionStatus, expiresAt: Date | null, now: Date = new Date()): CollectionStatus {
  if (status === "PUBLISHED" && expiresAt && expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return status;
}

export type PublishIssue = "NO_PHOTOS" | "NO_COVER" | "EXPIRY_IN_PAST" | "ARCHIVED";

export function publishIssues(
  input: { status: CollectionStatus; readyPhotoCount: number; coverPhotoId: string | null; expiresAt: Date | null },
  now: Date = new Date(),
): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (input.status === "ARCHIVED") issues.push("ARCHIVED");
  if (input.readyPhotoCount < 1) issues.push("NO_PHOTOS");
  if (!input.coverPhotoId) issues.push("NO_COVER");
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) issues.push("EXPIRY_IN_PAST");
  return issues;
}

export const PUBLISH_ISSUE_MESSAGES: Record<PublishIssue, string> = {
  NO_PHOTOS: "Adicione pelo menos uma foto antes de publicar.",
  NO_COVER: "Escolha uma foto de capa antes de publicar.",
  EXPIRY_IN_PAST: "A data de expiração já passou — prorrogue antes de publicar.",
  ARCHIVED: "Restaure esta coleção antes de publicar.",
};

/** Days until expiry, rounded up; null when the collection never expires. */
export function daysUntil(expiresAt: Date | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  return Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
}
