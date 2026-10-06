"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setCollectionWatermarkAction } from "@/actions/watermark.actions";
import { Button } from "@/components/ui/button";
import { FieldHint, Label, Select } from "@/components/ui/field";
import type { WatermarkOption } from "@/types/watermark";

export function DesignForm({ collectionId, watermarkId, watermarks }: { collectionId: string; watermarkId: string; watermarks: WatermarkOption[] }) {
  const router = useRouter();
  const [value, setValue] = useState(watermarkId);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await setCollectionWatermarkAction({ collectionId, watermarkId: value });
      if (!r.ok) return void toast.error(r.error);
      toast.success(value ? "Marca d’água aplicada" : "Marca d’água removida", {
        description: r.data.outdated ? `Atualizando ${r.data.outdated} prévias…` : undefined,
      });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <Label htmlFor="design-watermark">Marca d’água nas prévias</Label>
      <div className="flex flex-wrap gap-2">
        <Select id="design-watermark" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-72">
          <option value="">Sem marca d’água</option>
          {watermarks.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <Button onClick={save} disabled={pending || value === watermarkId}>
          {pending ? <Loader2 className="animate-spin" /> : null} Aplicar
        </Button>
      </div>
      <FieldHint>
        Originais e downloads nunca recebem marca d’água.{" "}
        <Link href="/dashboard/settings/watermarks" className="text-foreground underline underline-offset-4">
          Criar ou editar marcas d’água
        </Link>
      </FieldHint>
    </div>
  );
}
