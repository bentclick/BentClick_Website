import { ArrowLeft, Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectionActions } from "@/components/admin/selections/selection-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, pluralize } from "@/lib/utils/format";
import { idSchema } from "@/lib/validation/common";
import { NotFoundError } from "@/services/errors";
import { getSelection, listSelections } from "@/services/favorites/selections.service";
import { loadEditorCollection } from "../_load";

export const metadata: Metadata = { title: "Seleções" };

type Props = { params: Promise<{ collectionId: string }>; searchParams: Promise<{ session?: string }> };

export default async function SelectionsPage({ params, searchParams }: Props) {
  const [{ collectionId }, { session }] = await Promise.all([params, searchParams]);
  const { user, collection } = await loadEditorCollection(collectionId);
  const base = `/dashboard/collections/${collection.id}/selections`;

  if (session) {
    const id = idSchema.safeParse(session);
    if (!id.success) notFound();
    const detail = await getSelection(user.id, id.data).catch((e) => {
      if (e instanceof NotFoundError) notFound();
      throw e;
    });
    const label = detail.session.clientName ?? "Visitante sem nome";

    return (
      <div>
        <Link href={base} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Seleções
        </Link>
        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-[30px] font-medium leading-none">{label}</h2>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {pluralize(detail.photos.length, "foto selecionada", "fotos selecionadas")}
              {detail.session.clientEmail ? ` · ${detail.session.clientEmail}` : ""}
            </p>
          </div>
          <SelectionActions sessionId={detail.session.id} collectionId={collection.id} count={detail.photos.length} clientLabel={label} backHref={base} />
        </header>

        <ul className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {detail.photos.map((p) => (
            <li key={p.id}>
              <figure className="overflow-hidden rounded-[4px] bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                <img src={p.thumbUrl} alt={p.filename} loading="lazy" className="aspect-square w-full object-contain" />
                <figcaption className="truncate px-1.5 py-1 text-[11px] text-muted-foreground">{p.filename}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const selections = await listSelections(user.id, collection.id);

  return (
    <div>
      <h2 className="font-serif text-[30px] font-medium leading-none">Seleções</h2>
      <p className="mt-2 text-[12.5px] text-muted-foreground">Fotos que seus clientes marcaram com o coração na galeria.</p>

      {selections.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nenhuma seleção ainda."
          description="Quando o cliente favoritar fotos na galeria publicada, a seleção aparece aqui."
          className="mt-8 rounded-[6px] border border-dashed border-taupe bg-surface/50"
        />
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-[6px] border border-border bg-surface">
          {selections.map((s) => (
            <li key={s.id}>
              <Link href={`${base}?session=${s.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-background/70">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Heart className="size-4 fill-current" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[19px] leading-tight">{s.clientName ?? "Visitante sem nome"}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {s.submittedAt ? `Enviada em ${formatDate(s.submittedAt)}` : "Em andamento — ainda não enviada"}
                    {s.clientEmail ? ` · ${s.clientEmail}` : ""}
                  </span>
                </span>
                <span className="text-[13px] tabular-nums">{pluralize(s.count, "foto")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
