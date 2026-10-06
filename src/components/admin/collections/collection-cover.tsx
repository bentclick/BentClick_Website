import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

type CollectionCoverProps = {
  title: string;
  coverUrl: string | null;
  coverColor: string | null;
  className?: string;
  sizes?: "card" | "thumb";
};

/**
 * Cover image from a signed R2 URL. Uses a plain <img> on purpose: routing
 * signed R2 objects through next/image would proxy photo bytes via Vercel.
 */
export function CollectionCover({ title, coverUrl, coverColor, className, sizes = "card" }: CollectionCoverProps) {
  return (
    <div className={cn("relative overflow-hidden bg-subtle", className)} style={coverColor ? { backgroundColor: coverColor } : undefined}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#efebe4,#e4ded4)]">
          <span
            aria-hidden
            className={cn("font-serif font-light text-[#b9ac9c]", sizes === "card" ? "text-6xl" : "text-lg")}
          >
            {initials(title)}
          </span>
        </div>
      )}
    </div>
  );
}
