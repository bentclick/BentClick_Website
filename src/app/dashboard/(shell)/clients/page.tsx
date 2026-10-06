import { Users } from "lucide-react";
import type { Metadata } from "next";
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
      <PageHeader title="Clientes" count={clients.length || undefined} />
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente ainda."
          description="Os clientes são cadastrados ao criar uma coleção para eles."
          className="mt-10 rounded-[6px] border border-dashed border-taupe"
        />
      ) : (
        <div className="mt-10 overflow-hidden rounded-[6px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr className="[&>th]:eyebrow [&>th]:px-4 [&>th]:py-3">
                <th scope="col">Nome</th>
                <th scope="col" className="hidden sm:table-cell">
                  E-mail
                </th>
                <th scope="col" className="text-right">
                  Coleções
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3.5 font-serif text-lg">{client.name}</td>
                  <td className="hidden px-4 py-3.5 text-muted-foreground sm:table-cell">{client.email ?? "—"}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{client.collectionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
