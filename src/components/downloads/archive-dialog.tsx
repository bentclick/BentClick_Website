"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils/cn";
import { formatBytes, pluralize } from "@/lib/utils/format";

type ArchiveStatus = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  fileCount: number;
  totalBytes: number;
  partsReady: number;
  parts: { index: number; status: string; bytes: number }[];
};

export type ArchiveOption = { value: string; label: string; count: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  options: ArchiveOption[];
  /** POST body for a chosen option. */
  createRequest: (value: string) => { url: string; body: unknown };
  statusUrl: (jobId: string) => string;
  partUrl: (jobId: string, index: number) => string;
};

const POLL_MS = 3000;

/** Prepare → poll (each poll also resumes packing) → one link per part. */
export function ArchiveDialog({ open, onOpenChange, title = "Baixar fotos", description, options, createRequest, statusUrl, partUrl }: Props) {
  const [choice, setChoice] = useState(options.find((o) => o.count > 0)?.value ?? options[0]?.value);
  const [job, setJob] = useState<ArchiveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!job || job.status === "READY" || job.status === "FAILED") return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(statusUrl(job.id), { cache: "no-store" });
        if (res.ok) setJob(await res.json());
      } catch {
        /* next poll retries */
      }
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [job, statusUrl]);

  async function start() {
    if (!choice) return;
    setStarting(true);
    setError(null);
    try {
      const { url, body } = createRequest(choice);
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível preparar o download");
      setJob(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível preparar o download");
    } finally {
      setStarting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setJob(null);
      setError(null);
    }
    onOpenChange(next);
  }

  const progress = job ? (job.status === "READY" ? 1 : Math.max(0.04, job.partsReady / Math.max(1, job.parts.length))) : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>

        {!job ? (
          <div className="mt-6 grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="sr-only">O que baixar</legend>
              {options.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-[5px] border px-4 py-3 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                    choice === o.value ? "border-accent bg-accent-soft" : "border-border hover:border-taupe",
                    o.count === 0 && "pointer-events-none opacity-45",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input type="radio" name="archive-scope" value={o.value} checked={choice === o.value} onChange={() => setChoice(o.value)} disabled={o.count === 0} className="accent-[var(--accent)]" />
                    <span className="text-[14px]">{o.label}</span>
                  </span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">{pluralize(o.count, "foto")}</span>
                </label>
              ))}
            </fieldset>
            {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void start()} disabled={starting || !choice}>
                {starting ? <Loader2 className="animate-spin" /> : null} Preparar download
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2">
                {job.status === "READY" ? <Check className="size-4 text-accent" /> : job.status === "FAILED" ? null : <Loader2 className="size-4 animate-spin text-accent" />}
                {job.status === "READY"
                  ? "Arquivo pronto"
                  : job.status === "FAILED"
                    ? "Não foi possível preparar o arquivo"
                    : `Preparando ${pluralize(job.fileCount, "foto")}…`}
              </span>
              <span className="tabular-nums text-muted-foreground">{formatBytes(job.totalBytes)}</span>
            </div>
            <Progress value={progress} label="Progresso do arquivo" />
            {job.status !== "READY" && job.status !== "FAILED" ? (
              <p className="text-[12px] text-muted-foreground">Galerias grandes levam alguns minutos. Mantenha esta janela aberta.</p>
            ) : null}
            {job.status === "FAILED" ? (
              <Button variant="outline" onClick={() => setJob(null)}>
                Tentar de novo
              </Button>
            ) : null}
            {job.parts.some((p) => p.status === "READY") ? (
              <ul className="grid gap-2">
                {job.parts.map((p) => (
                  <li key={p.index}>
                    {p.status === "READY" ? (
                      <a
                        href={partUrl(job.id, p.index)}
                        className="flex items-center justify-between rounded-[5px] border border-border px-4 py-3 text-[13px] transition-colors hover:border-accent hover:bg-accent-soft"
                      >
                        <span className="flex items-center gap-2.5">
                          <Download className="size-4 text-accent" />
                          {job.parts.length > 1 ? `Parte ${p.index + 1} de ${job.parts.length}` : "Baixar ZIP"}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{formatBytes(p.bytes)}</span>
                      </a>
                    ) : (
                      <span className="flex items-center justify-between rounded-[5px] border border-dashed border-border px-4 py-3 text-[13px] text-muted-foreground">
                        Parte {p.index + 1} de {job.parts.length}
                        <Loader2 className="size-4 animate-spin" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {job.status === "READY" ? <p className="text-[11.5px] text-muted-foreground">O arquivo fica disponível por 72 horas.</p> : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
