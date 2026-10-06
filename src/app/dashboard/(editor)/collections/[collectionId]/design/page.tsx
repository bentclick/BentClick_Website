import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DesignForm } from "@/components/admin/editor/design-form";
import { PreviewRefresher } from "@/components/admin/editor/preview-refresher";
import { Button } from "@/components/ui/button";
import { listWatermarkOptions } from "@/services/watermarks/watermark.service";
import { loadEditorCollection } from "../_load";

export const metadata: Metadata = { title: "Design" };

export default async function DesignPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { user, collection } = await loadEditorCollection((await params).collectionId);
  const watermarks = await listWatermarkOptions(user.id);

  return (
    <div className="grid max-w-5xl gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-[30px] font-medium leading-none">Design</h2>
          <p className="mt-2 text-[12.5px] text-muted-foreground">Capa, layout e marca d’água da galeria do cliente.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/g/${collection.slug}?preview=1`} target="_blank" rel="noreferrer">
            <ExternalLink /> Ver como o cliente
          </a>
        </Button>
      </header>

      <PreviewRefresher key={`${collection.watermarkId}-${collection.outdatedPreviews}`} collectionId={collection.id} outdated={collection.outdatedPreviews} />

      <section className="grid gap-6 rounded-[8px] border border-border bg-surface p-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <div>
          <h3 className="font-serif text-[22px] font-medium leading-tight">Marca d’água</h3>
          <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">Protege as prévias que o cliente vê na galeria.</p>
        </div>
        <DesignForm collectionId={collection.id} watermarkId={collection.watermarkId ?? ""} watermarks={watermarks} />
      </section>

      <section className="grid gap-6 rounded-[8px] border border-border bg-surface p-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <h3 className="font-serif text-[22px] font-medium leading-tight">Capa e layout</h3>
        <div className="grid gap-2 text-[13px]">
          <p>
            Capa:{" "}
            <span className="text-muted-foreground">{collection.coverUrl ? "definida" : "ainda não definida — use “Definir como capa” no menu ⋯ de uma foto."}</span>
          </p>
          <p>
            Layout e permissões:{" "}
            <Link href={`/dashboard/collections/${collection.id}/settings#permissoes`} className="underline underline-offset-4">
              em Configurações
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
