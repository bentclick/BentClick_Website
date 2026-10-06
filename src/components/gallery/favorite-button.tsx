"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Heart over a tile: always visible once chosen; on desktop the empty heart appears on hover. */
export function FavoriteButton({ active, filename, onToggle }: { active: boolean; filename: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Remover ${filename} dos favoritos` : `Favoritar ${filename}`}
      className={cn(
        "absolute right-1.5 top-1.5 grid size-10 place-items-center rounded-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-200 active:scale-90",
        active ? "opacity-100" : "opacity-100 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0",
      )}
    >
      <Heart strokeWidth={1.6} className={cn("size-[19px]", active && "fill-white")} />
    </button>
  );
}
