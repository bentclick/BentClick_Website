import { ArrowDownUp, CheckSquare, Grid2x2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/utils/format";

const PENDING = "Disponível quando o envio direto ao R2 estiver ativo (fase 3)";

/** Gallery header: name, count and the grid tools. Tools enable with uploads. */
export function PhotoToolbar({ galleryName, photoCount }: { galleryName: string; photoCount: number }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-serif text-[28px] font-medium leading-none">{galleryName}</h2>
        <p className="mt-2 text-[12.5px] text-muted-foreground">{pluralize(photoCount, "foto")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="sm" disabled title={PENDING}>
          <ArrowDownUp strokeWidth={1.5} /> Ordenar
        </Button>
        <Button variant="ghost" size="sm" disabled title={PENDING}>
          <Grid2x2 strokeWidth={1.5} /> Tamanho da grade
        </Button>
        <Button variant="ghost" size="sm" disabled title={PENDING}>
          <CheckSquare strokeWidth={1.5} /> Selecionar
        </Button>
        <Button size="sm" disabled title={PENDING} className="ml-1">
          <ImagePlus strokeWidth={1.5} /> Adicionar mídia
        </Button>
      </div>
    </header>
  );
}
