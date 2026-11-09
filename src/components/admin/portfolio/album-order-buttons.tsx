"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { moveAlbumAction } from "@/actions/portfolio.actions";
import { Button } from "@/components/ui/button";

/** Moves an album earlier or later; the same order is used on the public site. */
export function AlbumOrderButtons({ albumId, title, first, last }: { albumId: string; title: string; first: boolean; last: boolean }) {
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const r = await moveAlbumAction({ albumId, direction });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1">
      <Button variant="outline" size="icon-sm" className="bg-surface" aria-label={`Mover ${title} para antes`} disabled={pending || first} onClick={() => move("up")}>
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="icon-sm" className="bg-surface" aria-label={`Mover ${title} para depois`} disabled={pending || last} onClick={() => move("down")}>
        <ChevronRight />
      </Button>
    </div>
  );
}
