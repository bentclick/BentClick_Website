"use client";

import { ArrowDownUp, CheckSquare, Grid2x2, Grid3x3, ImagePlus, LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { pluralize } from "@/lib/utils/format";

export type GridSize = "s" | "m" | "l";

const SIZES: { value: GridSize; label: string; icon: typeof Grid3x3 }[] = [
  { value: "s", label: "Pequena", icon: Grid3x3 },
  { value: "m", label: "Média", icon: Grid2x2 },
  { value: "l", label: "Grande", icon: LayoutGrid },
];

type Props = {
  galleryName: string;
  photoCount: number;
  gridSize: GridSize;
  onGridSize: (size: GridSize) => void;
  selecting: boolean;
  onToggleSelecting: () => void;
  onAddMedia: () => void;
};

export function PhotoToolbar({ galleryName, photoCount, gridSize, onGridSize, selecting, onToggleSelecting, onAddMedia }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-serif text-[28px] font-medium leading-none">{galleryName}</h2>
        <p className="mt-2 text-[12.5px] text-muted-foreground">{pluralize(photoCount, "foto")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="sm" disabled title="Ordenação manual chega com a organização das galerias">
          <ArrowDownUp strokeWidth={1.5} /> Ordenar
        </Button>
        <div role="group" aria-label="Tamanho da grade" className="flex items-center rounded-[5px] px-1">
          <span className="mr-1 hidden text-[12.5px] text-foreground/80 xl:inline">Tamanho da grade</span>
          {SIZES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={`Grade ${label.toLowerCase()}`}
              aria-pressed={gridSize === value}
              onClick={() => onGridSize(value)}
              className={cn("grid size-8 place-items-center rounded-[4px] text-muted-foreground hover:text-foreground", gridSize === value && "bg-subtle text-foreground")}
            >
              <Icon strokeWidth={1.5} className="size-4" />
            </button>
          ))}
        </div>
        <Button variant={selecting ? "outline" : "ghost"} size="sm" onClick={onToggleSelecting} disabled={photoCount === 0}>
          {selecting ? <X strokeWidth={1.5} /> : <CheckSquare strokeWidth={1.5} />} {selecting ? "Cancelar seleção" : "Selecionar"}
        </Button>
        <Button size="sm" onClick={onAddMedia} className="ml-1">
          <ImagePlus strokeWidth={1.5} /> Adicionar mídia
        </Button>
      </div>
    </header>
  );
}
