"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { UploadItem, UploadQueue } from "@/lib/uploads/upload-queue";
import { cn } from "@/lib/utils/cn";
import { Dropzone } from "./dropzone";
import { UploadRow } from "./upload-row";

const ORDER: Record<UploadItem["status"], number> = { failed: 0, uploading: 1, confirming: 2, processing: 3, queued: 4, done: 5 };
const MAX_ROWS = 80;

type Tab = "send" | "drive" | "folder";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryName: string;
  queue: UploadQueue;
  items: UploadItem[];
};

export function UploadDialog({ open, onOpenChange, galleryName, queue, items }: Props) {
  const [tab, setTab] = useState<Tab>("send");

  const { rows, hidden, done, active } = useMemo(() => {
    const sorted = [...items].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
    return {
      rows: sorted.slice(0, MAX_ROWS),
      hidden: Math.max(0, sorted.length - MAX_ROWS),
      done: items.filter((i) => i.status === "done").length,
      active: items.filter((i) => i.status !== "done" && i.status !== "failed").length,
    };
  }, [items]);

  const tabs: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: "send", label: "Enviar" },
    { key: "drive", label: "Google Drive", disabled: true },
    { key: "folder", label: "Pasta" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,760px)] max-w-xl flex-col p-0">
        <div className="px-6 pt-6">
          <DialogTitle className="text-[26px]">Adicionar fotos</DialogTitle>
          <DialogDescription>
            Para a galeria <span className="text-foreground">{galleryName}</span>. Os arquivos vão direto para o armazenamento privado.
          </DialogDescription>

          <div role="tablist" aria-label="Origem das fotos" className="mt-5 flex gap-6 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                disabled={t.disabled}
                title={t.disabled ? "Em breve" : undefined}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px border-b-2 border-transparent pb-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45",
                  tab === t.key && "border-accent font-medium text-foreground",
                )}
              >
                {t.label}
                {t.disabled ? <span className="ml-1.5 text-[10px] uppercase tracking-wider">em breve</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pt-5">
          <Dropzone key={tab} folder={tab === "folder"} onFiles={(files) => queue.add(files)} />
        </div>

        {items.length > 0 ? (
          <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-border">
            <div className="flex items-center justify-between px-6 py-3 text-[12px]">
              <span className="font-medium">
                {active > 0 ? `Enviando ${items.length} ${items.length === 1 ? "foto" : "fotos"}` : "Envio finalizado"}
              </span>
              <span className="flex items-center gap-3 text-muted-foreground tabular-nums">
                {done} de {items.length} concluídas
                {active === 0 ? (
                  <button type="button" onClick={() => queue.clearFinished()} className="text-foreground underline-offset-4 hover:underline">
                    Limpar lista
                  </button>
                ) : null}
              </span>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-6 pb-4">
              {rows.map((item) => (
                <UploadRow key={item.key} item={item} onCancel={() => queue.cancel(item.key)} onRetry={() => void queue.retry(item.key)} />
              ))}
              {hidden > 0 ? <li className="py-3 text-center text-[12px] text-muted-foreground">+ {hidden} na fila</li> : null}
            </ul>
          </div>
        ) : (
          <div className="pb-6" />
        )}
      </DialogContent>
    </Dialog>
  );
}
