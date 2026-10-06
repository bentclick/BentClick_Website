"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAlbumAction, updateAlbumAction } from "@/actions/portfolio.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";

type Props = { album: { id: string; title: string; category: PortfolioCategory; description: string; isPublished: boolean } };

export function AlbumSettings({ album }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ title: album.title, category: album.category, description: album.description, isPublished: album.isPublished });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateAlbumAction({ albumId: album.id, ...form });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      setErrors({});
      toast.success(form.isPublished ? "Álbum salvo e visível no site" : "Álbum salvo");
      router.refresh();
    });
  }

  return (
    <section className="grid gap-5 rounded-[8px] border border-border bg-surface p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid gap-2">
          <Label htmlFor="alb-title">Nome do álbum</Label>
          <Input id="alb-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} aria-invalid={!!errors.title} />
          <FieldError message={errors.title?.[0]} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="alb-category">Categoria</Label>
          <Select id="alb-category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as PortfolioCategory }))}>
            {PORTFOLIO_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="alb-description">Descrição</Label>
        <Textarea id="alb-description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Opcional" />
      </div>
      <SwitchField
        id="alb-published"
        label="Publicado no site"
        description="Fotos deste álbum aparecem no Portfólio e na página inicial."
        checked={form.isPublished}
        onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
      />
      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirm(true)}>
          <Trash2 /> Excluir álbum
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Salvar álbum
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Excluir “{album.title}”?</DialogTitle>
          <DialogDescription>O álbum e todas as fotos dele são apagados do armazenamento. Isso não pode ser desfeito.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await deleteAlbumAction(album.id);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success("Álbum excluído");
                  router.push("/dashboard/portfolio");
                })
              }
            >
              Excluir definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
