"use client";

import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { memo } from "react";
import type { UploadItem } from "@/lib/uploads/upload-queue";
import { cn } from "@/lib/utils/cn";
import { formatBytes } from "@/lib/utils/format";

const STATUS_LABEL: Record<UploadItem["status"], string> = {
  queued: "Na fila",
  uploading: "Enviando…",
  confirming: "Confirmando…",
  processing: "Gerando prévia…",
  done: "Enviada",
  failed: "Falhou",
};

type Props = { item: UploadItem; onCancel: () => void; onRetry: () => void };

export const UploadRow = memo(function UploadRow({ item, onCancel, onRetry }: Props) {
  const thumb = item.previewUrl;
  const pct = Math.round((item.status === "done" || item.status === "processing" || item.status === "confirming" ? 1 : item.progress) * 100);
  const failed = item.status === "failed";

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="size-10 shrink-0 overflow-hidden rounded-[4px] bg-subtle">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-[9px] font-medium uppercase text-muted-foreground">
            {item.name.split(".").pop()?.slice(0, 4)}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[13px]">{item.name}</span>
          <span className={cn("shrink-0 text-[11.5px] tabular-nums", failed ? "text-danger" : "text-muted-foreground")}>
            {failed ? "Falhou" : item.status === "uploading" ? `${pct}%` : STATUS_LABEL[item.status]}
          </span>
        </span>
        <span className="mt-1.5 flex items-center gap-3">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <span
              className={cn("block h-full rounded-full transition-[width] duration-200 ease-out", failed ? "bg-danger/60" : "bg-accent")}
              style={{ width: `${failed ? 100 : pct}%` }}
            />
          </span>
        </span>
        <span className={cn("mt-1 block truncate text-[11px]", failed ? "text-danger" : "text-muted-foreground")}>
          {failed ? item.error : formatBytes(item.size)}
        </span>
      </span>

      <span className="grid size-8 shrink-0 place-items-center">
        {item.status === "done" ? (
          <Check aria-label="Enviada" className="size-4 text-success" />
        ) : item.status === "processing" || item.status === "confirming" ? (
          <Loader2 aria-label="Processando" className="size-4 animate-spin text-muted-foreground" />
        ) : failed && item.retriable === false ? null : failed ? (
          <button type="button" onClick={onRetry} aria-label={`Tentar enviar ${item.name} de novo`} className="grid size-8 place-items-center rounded-[5px] text-muted-foreground hover:bg-subtle hover:text-foreground">
            <RotateCcw className="size-4" />
          </button>
        ) : (
          <button type="button" onClick={onCancel} aria-label={`Cancelar ${item.name}`} className="grid size-8 place-items-center rounded-[5px] text-muted-foreground hover:bg-subtle hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </span>
    </li>
  );
});
