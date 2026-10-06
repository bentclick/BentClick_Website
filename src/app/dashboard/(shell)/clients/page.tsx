import { Users } from "lucide-react";
import type { Metadata } from "next";
import { ClientsTable, NewClientButton } from "@/components/admin/clients/clients-table";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { listClients } from "@/services/clients/client.service";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await listClients(user.id);

  return (
    <PageContainer>
      <PageHeader title="Clientes" count={clients.length || undefined} actions={<NewClientButton />} />
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente ainda."
          description="Cadastre aqui ou direto ao criar uma coleção."
          className="mt-10 rounded-[6px] border border-dashed border-taupe"
        />
      ) : (
        <ClientsTable clients={clients} />
      )}
    </PageContainer>
  );
}
