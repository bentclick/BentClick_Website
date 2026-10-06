import type { WatermarkInput } from "@/lib/validation/watermark";
import { cn } from "@/lib/utils/cn";

const PLACE: Record<WatermarkInput["position"], string> = {
  CENTER: "items-center justify-center",
  TOP_LEFT: "items-start justify-start",
  TOP_RIGHT: "items-start justify-end",
  BOTTOM_LEFT: "items-end justify-start",
  BOTTOM_RIGHT: "items-end justify-end",
};

/**
 * Close CSS approximation of the server render (same proportions), on a
 * neutral photographic gradient. The real mark is drawn into previews only.
 */
export function WatermarkPreview({ value, logoUrl, className }: { value: WatermarkInput; logoUrl: string | null; className?: string }) {
  const widthPct = Math.min(100, value.size * 100 * (value.type === "TEXT" ? 1.6 : 1) * (2 / 3)); // shorter side of a 3:2 frame
  const mark =
    value.type === "IMAGE" ? (
      logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local/object or signed URL
        <img src={logoUrl} alt="" style={{ width: `${widthPct}%`, opacity: value.opacity }} className="h-auto" />
      ) : (
        <span className="text-[11px] text-white/70">Envie um logo PNG</span>
      )
    ) : (
      <span className="whitespace-nowrap font-serif leading-none" style={{ color: value.color, opacity: value.opacity, fontSize: `${widthPct / Math.max(4, value.text.length * 0.55)}cqw` }}>
        {value.text || "BentClick"}
      </span>
    );

  return (
    <div className={cn("relative aspect-[3/2] w-full overflow-hidden rounded-[6px] bg-[linear-gradient(160deg,#b58b68,#5c4232_60%,#2b211b)] [container-type:inline-size]", className)}>
      {value.tile ? (
        <div className="absolute inset-0 grid grid-cols-3 place-items-center gap-6 p-4">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="flex w-full justify-center">
              {mark}
            </span>
          ))}
        </div>
      ) : (
        <div className={cn("absolute inset-0 flex", PLACE[value.position])} style={{ padding: `${(value.margin / 2048) * 100}cqw` }}>
          {mark}
        </div>
      )}
    </div>
  );
}
