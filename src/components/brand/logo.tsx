import { cn } from "@/lib/utils/cn";
import { Monogram } from "./monogram";

export type LogoVariant = "mark" | "stacked" | "full" | "horizontal";

type LogoProps = {
  variant?: LogoVariant;
  /** Scales the whole lockup; the mark height in px. */
  size?: number;
  className?: string;
};

const BRAND = "BentClick";

/** Spaced editorial caps — "B E N T C L I C K". */
function Wordmark({ size, className }: { size: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block whitespace-nowrap font-serif font-medium uppercase leading-none", className)}
      style={{ fontSize: size, letterSpacing: "0.42em", marginRight: "-0.42em" }}
    >
      Bentclick
    </span>
  );
}

/**
 * Logo lockups. Colour follows `currentColor`, which gives the white version
 * over photography and the black version on light backgrounds for free.
 */
export function Logo({ variant = "horizontal", size = 36, className }: LogoProps) {
  if (variant === "mark") return <Monogram title={BRAND} className={className} />;

  if (variant === "horizontal") {
    return (
      <span role="img" aria-label={BRAND} className={cn("inline-flex items-center", className)} style={{ gap: size * 0.45 }}>
        <span style={{ height: size }} className="flex">
          <Monogram className="h-full" />
        </span>
        <span aria-hidden className="w-px bg-current opacity-30" style={{ height: size * 0.55 }} />
        <Wordmark size={Math.max(10, size * 0.3)} />
      </span>
    );
  }

  return (
    <span role="img" aria-label={BRAND} className={cn("inline-flex flex-col items-center", className)}>
      <span style={{ height: size }} className="flex">
        <Monogram className="h-full" />
      </span>
      <Wordmark size={size * 0.24} className="mt-[0.9em]" />
      {variant === "full" ? (
        <span
          aria-hidden
          className="mt-[1.1em] block font-sans font-normal uppercase leading-none opacity-70"
          style={{ fontSize: size * 0.11, letterSpacing: "0.6em", marginRight: "-0.6em" }}
        >
          Fotografia
        </span>
      ) : null}
    </span>
  );
}
