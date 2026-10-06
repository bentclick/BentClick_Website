import { Activity } from "lucide-react";
import type { Metadata } from "next";
import { StatTiles } from "@/components/admin/activity/stat-tiles";
import { EmptyState } from "@/components/ui/empty-state";
import { describeActivity } from "@/lib/constants/activity";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber as n } from "@/lib/utils/format";
import { getCollectionStats, listCollectionActivity } from "@/services/activity/activity.service";
import { loadEditorCollection } from "../_load";

export const metadata: Metadata = { title: "Atividade" };

const time = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function ActivityPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { user, collection } = await loadEditorCollection((await params).collectionId);
  const [stats, items] = await Promise.all([getCollectionStats(user.id, collection.id), listCollectionActivity(user.id, collection.id)]);

  return (
    <div className="grid max-w-5xl gap-6">
      <header>
        <h2 className="font-serif text-[30px] font-medium leading-none">Atividade</h2>
        <p className="mt-2 text-[12.5px] text-muted-foreground">Como o cliente está usando a galeria.</p>
      </header>

      <StatTiles
        stats={[
          { label: "Visualizações", value: n(stats.views), hint: `${n(stats.visitors)} ${stats.visitors === 1 ? "visitante" : "visitantes"} com sessão` },
          { label: "Favoritos", value: n(stats.favorites) },
          { label: "Seleções enviadas", value: n(stats.selections) },
          { label: "Downloads", value: n(stats.downloads) },
          { label: "Último acesso", value: stats.lastAccessedAt ? formatDate(stats.lastAccessedAt) : "—" },
        ]}
      />

      <section className="rounded-[8px] border border-border bg-surface">
        <h3 className="border-b border-border px-6 py-4 font-serif text-[20px] font-medium">Linha do tempo</h3>
        {items.length === 0 ? (
          <EmptyState icon={Activity} title="Nada por aqui ainda." description="Visualizações, favoritos e downloads aparecem aqui assim que a galeria é aberta." className="py-14" />
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-baseline gap-4 px-6 py-3 text-[13px]">
                <span
                  aria-hidden
                  className={cn("size-1.5 shrink-0 translate-y-[-1px] rounded-full", item.actor === "CLIENT" ? "bg-accent" : item.actor === "SYSTEM" ? "bg-warning" : "bg-muted-foreground/50")}
                />
                <span className="min-w-0 flex-1">{describeActivity(item.type, item.who, item.metadata)}</span>
                <time dateTime={item.createdAt} className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                  {time.format(new Date(item.createdAt))}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
