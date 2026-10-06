"use client";

import { Check, Copy, ExternalLink, Loader2, Mail, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { publishCollectionAction } from "@/actions/collection.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { DOWNLOAD_QUALITY_LABELS } from "@/lib/constants/collection";
import { cn } from "@/lib/utils/cn";
import { formatLongDate, pluralize } from "@/lib/utils/format";
import { galleryUrl } from "@/lib/utils/urls";
import type { DownloadQuality } from "@/generated/prisma/enums";

export type PublishSummary = {
  hasCover: boolean;
  readyPhotos: number;
  expiresAt: string | null;
  /** Computed on the server so rendering stays pure. */
  expiryPassed: boolean;
  downloadQuality: DownloadQuality;
  allowIndividualDownload: boolean;
  allowFullDownload: boolean;
  allowFavorites: boolean;
  hasPassword: boolean;
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void; collection: { id: string; slug: string; title: string }; summary: PublishSummary };

function Check1({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", ok ? "bg-success-soft text-success" : "bg-danger/10 text-danger")}>
        {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
      </span>
      <span className="text-[13px]">
        {label}
        {!ok && hint ? <span className="block text-[12px] text-muted-foreground">{hint}</span> : null}
      </span>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

/** Checklist + summary, then the shareable link once it's live. */
export function PublishDialog({ open, onOpenChange, collection, summary }: Props) {
  const router = useRouter();
  const copy = useCopyToClipboard();
  const [published, setPublished] = useState(false);
  const [pending, startTransition] = useTransition();
  const ready = summary.hasCover && summary.readyPhotos > 0 && !summary.expiryPassed;
  const url = galleryUrl(collection.slug);
  const settingsHref = `/dashboard/collections/${collection.id}/settings`;

  function publish() {
    startTransition(async () => {
      const result = await publishCollectionAction(collection.id);
      if (!result.ok) return void toast.error(result.error);
      setPublished(true);
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setPublished(false);
    onOpenChange(next);
  }

  const download = summary.allowFullDownload
    ? `Coleção completa · ${DOWNLOAD_QUALITY_LABELS[summary.downloadQuality].label}`
    : summary.allowIndividualDownload
      ? `Foto a foto · ${DOWNLOAD_QUALITY_LABELS[summary.downloadQuality].label}`
      : "Desativado";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {!published ? (
          <>
            <DialogTitle>{ready ? "Galeria pronta" : "Quase lá"}</DialogTitle>
            <DialogDescription>Confira antes de liberar o acesso para o cliente.</DialogDescription>
            <ul className="mt-5 grid gap-2.5">
              <Check1 ok={summary.readyPhotos > 0} label={summary.readyPhotos > 0 ? pluralize(summary.readyPhotos, "foto pronta", "fotos prontas") : "Nenhuma foto pronta"} hint="Envie fotos e aguarde as prévias." />
              <Check1 ok={summary.hasCover} label={summary.hasCover ? "Capa definida" : "Sem foto de capa"} hint="No menu ⋯ de uma foto, use “Definir como capa”." />
              {summary.expiryPassed ? (
                <Check1 ok={false} label="A data de expiração já passou" hint="Ajuste a expiração em Configurações." />
              ) : null}
            </ul>
            <dl className="mt-5 divide-y divide-border border-y border-border">
              <Row label="Expiração" value={summary.expiresAt ? formatLongDate(summary.expiresAt) : "Nunca expira"} />
              <Row label="Download" value={download} />
              <Row label="Favoritos" value={summary.allowFavorites ? "Ativados" : "Desativados"} />
              <Row label="Senha" value={summary.hasPassword ? "Ativada" : "Desativada"} />
            </dl>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <Link href={settingsHref} onClick={() => handleOpenChange(false)} className="text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Ajustar configurações
              </Link>
              <Button onClick={publish} disabled={!ready || pending}>
                {pending ? <Loader2 className="animate-spin" /> : null} Publicar galeria
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
              <Check className="size-5" />
            </span>
            <DialogTitle className="mt-4">Galeria publicada</DialogTitle>
            <DialogDescription>Envie este link para o cliente{summary.hasPassword ? " junto com a senha" : ""}.</DialogDescription>
            <code className="mt-5 block truncate rounded-[5px] border border-border bg-background px-3 py-2.5 text-[13px]">{url}</code>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => copy(url, "Link copiado")}>
                <Copy /> Copiar link
              </Button>
              <Button asChild variant="outline">
                <Link href={`/dashboard/collections/${collection.id}/sharing`} onClick={() => handleOpenChange(false)}>
                  <Mail /> Enviar por e-mail
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink /> Ver galeria
                </a>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
