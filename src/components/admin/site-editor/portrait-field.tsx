"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { removePortraitAction, uploadPortraitAction } from "@/actions/site.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";

const MAX_EDGE = 2000;

/** Phone photos are 5–15 MB; shrink in the browser (keeping orientation) so the upload stays small. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9));
}

/** The photographer's own photo — saved on its own, right away (not part of the text document). */
export function PortraitField({ url }: { url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preparing, setPreparing] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return void toast.error("Use uma foto JPG, PNG ou WebP.");
    setPreparing(true);
    let blob: Blob;
    try {
      blob = await shrink(file);
    } catch {
      setPreparing(false);
      return void toast.error("Não foi possível ler esta foto. Tente outra.");
    }
    setPreparing(false);
    const form = new FormData();
    form.set("portrait", new File([blob], "retrato.jpg", { type: "image/jpeg" }));
    startTransition(async () => {
      const r = await uploadPortraitAction(form);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Foto atualizada", { description: "Já aparece na página Sobre." });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await removePortraitAction();
      if (!r.ok) return void toast.error(r.error);
      toast.success("Foto removida");
      router.refresh();
    });
  }

  const busy = pending || preparing;

  return (
    <div className="grid gap-2">
      <Label htmlFor="portrait-input">Sua foto</Label>
      <div className="flex items-end gap-4">
        <div className="grid aspect-[4/5] w-28 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-border bg-subtle">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, served as-is
            <img src={url} alt="Sua foto atual" className="size-full object-cover" />
          ) : (
            <ImagePlus strokeWidth={1.3} className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="grid gap-2">
          <p className="text-[12px] leading-5 text-muted-foreground">Aparece na página Sobre e no resumo da página inicial. Salva na hora.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {url ? "Trocar foto" : "Enviar foto"}
            </Button>
            {url ? (
              <Button type="button" size="sm" variant="ghost" className="text-danger hover:text-danger" disabled={busy} onClick={remove}>
                <Trash2 /> Remover
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={input}
        id="portrait-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
