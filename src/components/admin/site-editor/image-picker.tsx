"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { PickableImage } from "@/types/site";

type Props = { images: PickableImage[]; selected: string[]; max: number; onChange: (ids: string[]) => void };

/** Pick up to `max` portfolio photos; the number shows their order in the hero slideshow. */
export function ImagePicker({ images, selected, max, onChange }: Props) {
  if (images.length === 0) {
    return (
      <p className="rounded-[6px] border border-dashed border-taupe px-4 py-5 text-[13px] text-muted-foreground">
        Envie fotos no{" "}
        <Link href="/dashboard/portfolio" className="text-foreground underline underline-offset-4">
          Portfólio
        </Link>{" "}
        para escolher as fotos da abertura. Sem escolha, usamos as capas dos álbuns publicados.
      </p>
    );
  }

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else if (selected.length < max) onChange([...selected, id]);
  }

  return (
    <div>
      <ul className="grid max-h-[340px] grid-cols-4 gap-1.5 overflow-y-auto rounded-[6px] border border-border p-1.5 sm:grid-cols-5">
        {images.map((img) => {
          const order = selected.indexOf(img.id);
          return (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => toggle(img.id)}
                aria-pressed={order >= 0}
                aria-label={`${order >= 0 ? "Remover" : "Usar"} foto do álbum ${img.album}`}
                title={img.album}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-[3px] bg-subtle",
                  order >= 0 && "ring-2 ring-accent ring-offset-1",
                  order < 0 && selected.length >= max && "opacity-40",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                <img src={img.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
                {order >= 0 ? (
                  <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">{order + 1}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {selected.length}/{max} escolhidas · sem escolha, usamos as capas dos álbuns publicados.
      </p>
    </div>
  );
}
