import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/** Typographic empty state — no illustrations, one hairline icon at most. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-24 text-center", className)}>
      {Icon ? <Icon aria-hidden strokeWidth={1.25} className="mb-6 size-7 text-muted-foreground" /> : null}
      <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-[34px]">{title}</h2>
      {description ? <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
