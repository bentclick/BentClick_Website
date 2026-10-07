import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LeadCard } from "@/components/admin/leads/lead-card";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { LeadStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { listLeads } from "@/services/leads/lead.service";

export const metadata: Metadata = { title: "Contatos" };

const TABS = [
  { key: "novos", status: "NEW", label: "Novos" },
  { key: "respondidos", status: "CONTACTED", label: "Respondidos" },
  { key: "arquivados", status: "ARCHIVED", label: "Arquivados" },
  { key: "todos", status: null, label: "Todos" },
] as const satisfies readonly { key: string; status: LeadStatus | null; label: string }[];

/** Messages from the website's contact form. */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const user = await requireUser();
  const { ver } = await searchParams;
  const tab = TABS.find((t) => t.key === ver) ?? TABS[0];
  const { leads, counts } = await listLeads(user.id, tab.status);
  const total = counts.NEW + counts.CONTACTED + counts.ARCHIVED;

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Contatos" description="Mensagens enviadas pelo formulário do seu site." />

      <nav aria-label="Filtrar contatos" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
        {TABS.map((t) => {
          const count = t.status ? counts[t.status] : total;
          return (
            <Link
              key={t.key}
              href={`/dashboard/leads?ver=${t.key}`}
              aria-current={t.key === tab.key ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-[13px] transition-colors",
                t.key === tab.key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="tabular-nums opacity-60">{count}</span>
            </Link>
          );
        })}
      </nav>

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab.status === "NEW" ? "Nenhum contato novo." : "Nada por aqui."}
          description="Quando alguém enviar uma mensagem pelo site, ela aparece aqui e no seu e-mail."
          className="mt-10 rounded-[6px] border border-dashed border-taupe"
        />
      ) : (
        <ul className="mt-6 grid gap-3">
          {leads.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
