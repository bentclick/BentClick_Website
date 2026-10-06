"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/lib/uploads/file-types";
import { cn } from "@/lib/utils/cn";

type Props = { onFiles: (files: File[]) => void; folder?: boolean; className?: string };

/** Drag-and-drop target that is also a button (keyboard + click open the picker). */
export function Dropzone({ onFiles, folder = false, className }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
      // stopPropagation: React bubbles through portals, so without it the
      // editor's page-level drop target would queue the same files again.
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-[6px] border border-dashed border-taupe bg-background/60 px-6 py-10 text-center transition-colors duration-200 hover:border-accent/60 hover:bg-accent-soft/40",
        over && "border-accent bg-accent-soft",
        className,
      )}
    >
      <Upload strokeWidth={1.3} className="size-7 text-muted-foreground" />
      <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.16em]">
        {folder ? "Selecione uma pasta" : "Arraste e solte as fotos aqui"}
      </p>
      <p className="mt-1.5 text-[12.5px] text-accent">{folder ? "todas as fotos dela serão enviadas" : "ou clique para selecionar"}</p>
      <p className="mt-4 text-[11px] text-muted-foreground">JPG, PNG, WebP e RAW · até 200 MB por arquivo</p>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={folder ? undefined : ACCEPT_ATTRIBUTE}
        {...(folder ? { webkitdirectory: "", directory: "" } : {})}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
