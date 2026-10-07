"use client";

import { Archive, CheckCheck, Loader2, Mail, MessageCircle, RotateCcw, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { convertLeadAction, deleteLeadAction, setLeadStatusAction } from "@/actions/lead.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { LeadStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/actions/result";
import { CATEGORY_LABELS } from "@/lib/constants/collection";
import { cn } from "@/lib/utils/cn";
import type { LeadItem } from "@/types/lead";

const STATUS_BADGE: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: "Novo", className: "bg-accent text-white" },
  CONTACTED: { label: "Respondido", className: "bg-success/10 text-success" },
  ARCHIVED: { label: "Arquivado", className: "bg-subtle text-muted-foreground" },
};

// Fixed zone: the server (UTC on Vercel) and the browser must render the same text.
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const day = (ymd: string) => ymd.split("-").reverse().join("/");

export function LeadCard({ lead }: { lead: LeadItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const whatsapp = lead.phone?.replace(/\D/g, "");
  const badge = STATUS_BADGE[lead.status];

  function run<T>(action: () => Promise<ActionResult<T>>, success: string, onDone?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) return void toast.error(r.error);
      toast.success(success);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <article className={cn("rounded-[8px] border bg-surface p-5", lead.status === "NEW" ? "border-accent/40" : "border-border")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-[22px] leading-tight">{lead.name}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium", badge.className)}>{badge.label}</span>
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {dateTime(lead.createdAt)}
            {lead.eventType ? ` · ${CATEGORY_LABELS[lead.eventType]}` : ""}
            {lead.eventDate ? ` · evento em ${day(lead.eventDate)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${lead.email}`}>
              <Mail /> {lead.email}
            </a>
          </Button>
          {whatsapp ? (
            <Button asChild variant="outline" size="sm">
              <a href={`https://wa.me/${whatsapp.length <= 11 ? `55${whatsapp}` : whatsapp}`} target="_blank" rel="noreferrer">
                <MessageCircle /> {lead.phone}
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-foreground/85">{lead.message}</p>

      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {lead.status !== "CONTACTED" ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setLeadStatusAction({ leadId: lead.id, status: "CONTACTED" }), "Marcado como respondido")}>
            <CheckCheck /> Marcar como respondido
          </Button>
        ) : null}
        {lead.status !== "ARCHIVED" ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setLeadStatusAction({ leadId: lead.id, status: "ARCHIVED" }), "Contato arquivado")}>
            <Archive /> Arquivar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setLeadStatusAction({ leadId: lead.id, status: "NEW" }), "Contato movido para Novos")}>
            <RotateCcw /> Mover para Novos
          </Button>
        )}
        {lead.clientId ? (
          <Link href="/dashboard/clients" className="text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Já é cliente
          </Link>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => convertLeadAction(lead.id), "Cliente criado", undefined)}>
            <UserPlus /> Criar cliente
          </Button>
        )}
        <span className="flex-1" />
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        <Button size="sm" variant="ghost" className="text-danger hover:text-danger" disabled={pending} onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Excluir
        </Button>
      </footer>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Excluir a mensagem de {lead.name}?</DialogTitle>
          <DialogDescription>Não dá para desfazer. Se quiser só tirar da lista, use Arquivar.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => run(() => deleteLeadAction(lead.id), "Mensagem excluída", () => setConfirmDelete(false))}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
