import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DOWNLOAD_KIND_LABELS } from "@/lib/constants/activity";
import { DOWNLOAD_QUALITY_LABELS } from "@/lib/constants/collection";
import { requireUser } from "@/lib/auth/session";
import { formatBytes } from "@/lib/utils/format";
import { listDownloads } from "@/services/activity/activity.service";
import type { DownloadQuality } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Downloads" };

const when = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function DownloadsPage() {
  const user = await requireUser();
  const rows = await listDownloads(user.id);

  return (
    <PageContainer>
      <PageHeader title="Downloads" description="Cada foto e arquivo baixado pelos seus clientes." />
      {rows.length === 0 ? (
        <EmptyState
          icon={Download}
          title="Nenhum download ainda."
          description="Os downloads das galerias publicadas aparecem aqui, por coleção."
          className="mt-10 rounded-[6px] border border-dashed border-taupe bg-surface/50"
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[6px] border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-border">
              <tr className="[&>th]:eyebrow [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                <th scope="col">Quando</th>
                <th scope="col">Coleção</th>
                <th scope="col">O quê</th>
                <th scope="col">Quem</th>
                <th scope="col" className="text-right">
                  Tamanho
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{when.format(new Date(r.createdAt))}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/collections/${r.collectionId}/activity`} className="font-serif text-[16px] hover:text-accent-hover">
                      {r.collectionTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {DOWNLOAD_KIND_LABELS[r.kind] ?? r.kind}
                    {r.filename ? <span className="text-muted-foreground"> · {r.filename}</span> : null}
                    <span className="block text-[11.5px] text-muted-foreground">{DOWNLOAD_QUALITY_LABELS[r.quality as DownloadQuality]?.label}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.who ?? "Visitante"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.bytes ? formatBytes(r.bytes) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
