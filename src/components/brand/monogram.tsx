import { cn } from "@/lib/utils/cn";
import { MONOGRAM_B, MONOGRAM_C, MONOGRAM_VIEWBOX } from "./monogram-paths";

type MonogramProps = { className?: string; title?: string };

/**
 * The BC signature mark. Pure vector outlines, painted with currentColor —
 * set `text-white` over photography, `text-foreground` on light surfaces.
 */
export function Monogram({ className, title }: MonogramProps) {
  return (
    <svg
      viewBox={MONOGRAM_VIEWBOX}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("h-10 w-auto shrink-0", className)}
    >
      {title ? <title>{title}</title> : null}
      <path d={MONOGRAM_B} />
      <path d={MONOGRAM_C} />
    </svg>
  );
}
