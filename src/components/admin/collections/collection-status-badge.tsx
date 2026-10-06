import type { CollectionStatus } from "@/generated/prisma/enums";
import { EXPIRY_WARNING_DAYS, STATUS_LABELS } from "@/lib/constants/collection";
import { cn } from "@/lib/utils/cn";
import { daysUntil } from "@/services/collections/collection-rules";

type Tone = "published" | "draft" | "warning" | "muted";

const TONES: Record<Tone, string> = {
  published: "bg-success-soft text-success [&>i]:bg-success",
  draft: "bg-subtle text-muted-foreground [&>i]:bg-muted-foreground/60",
  warning: "bg-warning-soft text-warning [&>i]:bg-warning",
  muted: "bg-subtle text-muted-foreground [&>i]:bg-taupe",
};

/** Published galleries close to expiry read as a warning: "Expira em 15 dias". */
export function describeStatus(status: CollectionStatus, expiresAt: string | null): { label: string; tone: Tone } {
  if (status === "PUBLISHED") {
    const days = daysUntil(expiresAt ? new Date(expiresAt) : null);
    if (days !== null && days > 0 && days <= EXPIRY_WARNING_DAYS) {
      return { label: days === 1 ? "Expira amanhã" : `Expira em ${days} dias`, tone: "warning" };
    }
    return { label: STATUS_LABELS.PUBLISHED, tone: "published" };
  }
  if (status === "EXPIRED") return { label: STATUS_LABELS.EXPIRED, tone: "warning" };
  if (status === "ARCHIVED") return { label: STATUS_LABELS.ARCHIVED, tone: "muted" };
  return { label: STATUS_LABELS.DRAFT, tone: "draft" };
}

type Props = { status: CollectionStatus; expiresAt?: string | null; className?: string };

/** Subtle tinted badge with a status dot — small radius, never a loud pill. */
export function CollectionStatusBadge({ status, expiresAt = null, className }: Props) {
  const { label, tone } = describeStatus(status, expiresAt);
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[11.5px] font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      <i aria-hidden className="size-1.5 rounded-full" />
      {label}
    </span>
  );
}
