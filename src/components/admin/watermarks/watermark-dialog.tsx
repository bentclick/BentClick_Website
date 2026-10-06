"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteWatermarkAction, saveWatermarkAction } from "@/actions/watermark.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import { cn } from "@/lib/utils/cn";
import type { WatermarkInput } from "@/lib/validation/watermark";
import type { WatermarkItem } from "@/types/watermark";
import { WatermarkPreview } from "./watermark-preview";

const POSITIONS: { value: WatermarkInput["position"]; label: string }[] = [
  { value: "CENTER", label: "Centro" },
  { value: "TOP_LEFT", label: "Superior esquerdo" },
  { value: "TOP_RIGHT", label: "Superior direito" },
  { value: "BOTTOM_LEFT", label: "Inferior esquerdo" },
  { value: "BOTTOM_RIGHT", label: "Inferior direito" },
];

const EMPTY: WatermarkInput = { name: "", type: "TEXT", text: "BentClick", color: "#FFFFFF", opacity: 0.5, size: 0.2, position: "BOTTOM_RIGHT", margin: 48, tile: false };

type Props = { open: boolean; onOpenChange: (open: boolean) => void; watermark?: WatermarkItem };

export function WatermarkDialog({ open, onOpenChange, watermark }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<WatermarkInput>(watermark ?? EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<WatermarkInput>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  function pickLogo(file: File | null) {
    setLogo(file);
    setLocalUrl(file ? URL.createObjectURL(file) : null);
  }

  function save() {
    const body = new FormData();
    body.set("data", JSON.stringify(form));
    if (watermark) body.set("watermarkId", watermark.id);
    if (logo) body.set("logo", logo);
    startTransition(async () => {
      const r = await saveWatermarkAction(body);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      toast.success(watermark ? "Marca d’água atualizada" : "Marca d’água criada", {
        description: watermark && watermark.usedBy > 0 ? "As prévias das coleções que a usam serão atualizadas ao abrir cada coleção." : undefined,
      });
      onOpenChange(false);
      router.refresh();
    });
  }

  function remove() {
    if (!watermark) return;
    startTransition(async () => {
      const r = await deleteWatermarkAction(watermark.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Marca d’água excluída");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogTitle>{watermark ? "Editar marca d’água" : "Nova marca d’água"}</DialogTitle>
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="grid content-start gap-4">
            <div className="grid gap-2">
              <Label htmlFor="wm-name">Nome</Label>
              <Input id="wm-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Assinatura branca" aria-invalid={!!errors.name} />
              <FieldError message={errors.name?.[0]} />
            </div>
            <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 rounded-[5px] border border-taupe p-0.5">
              {(["TEXT", "IMAGE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={form.type === t}
                  onClick={() => set({ type: t })}
                  className={cn("h-8 rounded-[4px] text-[12.5px] text-muted-foreground", form.type === t && "bg-foreground text-white")}
                >
                  {t === "TEXT" ? "Texto" : "Logo"}
                </button>
              ))}
            </div>
            {form.type === "TEXT" ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="wm-text">Texto</Label>
                  <Input id="wm-text" value={form.text} onChange={(e) => set({ text: e.target.value })} aria-invalid={!!errors.text} />
                  <FieldError message={errors.text?.[0]} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wm-color">Cor</Label>
                  <input id="wm-color" type="color" value={form.color} onChange={(e) => set({ color: e.target.value.toUpperCase() })} className="h-10 w-12 cursor-pointer rounded-[5px] border border-taupe bg-surface p-1" />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="wm-logo">Logo (PNG ou WebP com fundo transparente, até 2 MB)</Label>
                <Input id="wm-logo" type="file" accept="image/png,image/webp" className="py-2" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="wm-opacity">Opacidade · {Math.round(form.opacity * 100)}%</Label>
              <input id="wm-opacity" type="range" min={0.05} max={1} step={0.05} value={form.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} className="accent-[var(--accent)]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wm-size">Tamanho · {Math.round(form.size * 100)}%</Label>
              <input id="wm-size" type="range" min={0.05} max={0.8} step={0.01} value={form.size} onChange={(e) => set({ size: Number(e.target.value) })} className="accent-[var(--accent)]" />
            </div>
            <SwitchField id="wm-tile" label="Repetir em toda a foto" checked={form.tile} onChange={(e) => set({ tile: e.target.checked })} />
            {!form.tile ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="wm-position">Posição</Label>
                  <Select id="wm-position" value={form.position} onChange={(e) => set({ position: e.target.value as WatermarkInput["position"] })}>
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wm-margin">Margem · {form.margin}px</Label>
                  <input id="wm-margin" type="range" min={0} max={200} step={4} value={form.margin} onChange={(e) => set({ margin: Number(e.target.value) })} className="mt-3 accent-[var(--accent)]" />
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <p className="eyebrow mb-2">Pré-visualização</p>
            <WatermarkPreview value={form} logoUrl={localUrl ?? watermark?.logoUrl ?? null} />
            <p className="mt-2 text-[12px] text-muted-foreground">Aplicada só nas prévias da galeria — originais e downloads ficam intactos.</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
          {watermark ? (
            <Button variant="ghost" className="text-danger hover:text-danger" onClick={remove} disabled={pending}>
              <Trash2 /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
