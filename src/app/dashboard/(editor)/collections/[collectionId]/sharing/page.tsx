import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { LinkCard } from "@/components/admin/collection-settings/link-card";
import { EmailForm } from "@/components/admin/sharing/email-form";
import { DEFAULT_GALLERY_MESSAGE } from "@/lib/email/templates";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { listEmailLog } from "@/services/email/email.service";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { loadEditorCollection } from "../_load";

export const metadata: Metadata = { title: "Compartilhamento" };

const STATUS: Record<string, { label: string; tone: string }> = {
  QUEUED: { label: "Na fila", tone: "bg-subtle text-muted-foreground" },
  SENT: { label: "Enviado", tone: "bg-accent-soft text-accent-hover" },
  DELIVERED: { label: "Entregue", tone: "bg-success-soft text-success" },
  BOUNCED: { label: "Devolvido", tone: "bg-warning-soft text-warning" },
  FAILED: { label: "Falhou", tone: "bg-danger/10 text-danger" },
};

export default async function SharingPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { user, collection } = await loadEditorCollection((await params).collectionId);
  const emails = await listEmailLog(user.id, collection.id);

  const linkView = {
    id: collection.id,
    slug: collection.slug,
    linkEnabled: collection.linkEnabled,
  } as CollectionSettingsView;

  return (
    <div className="grid max-w-5xl gap-6">
      <header>
        <h2 className="font-serif text-[30px] font-medium leading-none">Compartilhamento</h2>
        <p className="mt-2 text-[12.5px] text-muted-foreground">Envie o link da galeria e acompanhe as entregas.</p>
      </header>

      <LinkCard collection={linkView} />

      <section className="grid gap-6 rounded-[8px] border border-border bg-surface p-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <div>
          <h3 className="font-serif text-[22px] font-medium leading-tight">Enviar por e-mail</h3>
          <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">Um e-mail elegante com sua marca e o botão para a galeria.</p>
        </div>
        <div className="max-w-xl">
          <EmailForm
            collectionId={collection.id}
            defaultRecipient={collection.client?.email ?? ""}
            defaultMessage={DEFAULT_GALLERY_MESSAGE(collection.client?.name ?? null)}
            published={collection.status === "PUBLISHED" && collection.linkEnabled}
          />
        </div>
      </section>

      <section className="rounded-[8px] border border-border bg-surface">
        <h3 className="border-b border-border px-6 py-4 font-serif text-[20px] font-medium">Histórico de envios</h3>
        {emails.length === 0 ? (
          <p className="flex items-center gap-2 px-6 py-8 text-[13px] text-muted-foreground">
            <Mail className="size-4" /> Nenhum e-mail enviado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {emails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate">{e.recipient}</span>
                <span className="hidden text-muted-foreground sm:inline">{formatDate(e.createdAt)}</span>
                <span className={cn("rounded-[4px] px-2 py-0.5 text-[11.5px] font-medium", STATUS[e.status]?.tone)} title={e.error ?? undefined}>
                  {STATUS[e.status]?.label ?? e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
