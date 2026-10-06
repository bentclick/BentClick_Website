"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createAlbumAction } from "@/actions/portfolio.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import type { PortfolioCategory } from "@/generated/prisma/enums";
import { PORTFOLIO_CATEGORIES } from "@/lib/constants/portfolio";

export function NewAlbumButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PortfolioCategory>("WEDDING");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createAlbumAction({ title, category, description: "", isPublished: false });
      if (!r.ok) {
        setError(r.fieldErrors?.title?.[0] ?? r.error);
        return;
      }
      setOpen(false);
      setTitle("");
      router.push(`/dashboard/portfolio/${r.data.id}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Novo álbum
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Novo álbum</DialogTitle>
          <DialogDescription>Álbuns organizam o portfólio por categoria no site público.</DialogDescription>
          <form onSubmit={create} noValidate className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="album-title">Nome do álbum</Label>
              <Input id="album-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Casamento na praia" aria-invalid={!!error} />
              <FieldError message={error} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="album-category">Categoria</Label>
              <Select id="album-category" value={category} onChange={(e) => setCategory(e.target.value as PortfolioCategory)}>
                {PORTFOLIO_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? <Loader2 className="animate-spin" /> : null} Criar álbum
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
