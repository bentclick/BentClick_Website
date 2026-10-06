"use client";

import { Plus, Stamp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { WatermarkItem } from "@/types/watermark";
import { WatermarkDialog } from "./watermark-dialog";
import { WatermarkPreview } from "./watermark-preview";

export function WatermarkList({ watermarks }: { watermarks: WatermarkItem[] }) {
  const [editing, setEditing] = useState<WatermarkItem | "new" | null>(null);

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> Nova marca d’água
        </Button>
      </div>
      {watermarks.length === 0 ? (
        <EmptyState icon={Stamp} title="Nenhuma marca d’água." description="Crie com texto ou com o seu logo. Ela aparece só nas prévias das galerias." className="rounded-[6px] border border-dashed border-taupe" />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {watermarks.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => setEditing(w)} className="block w-full overflow-hidden rounded-[6px] border border-border bg-surface text-left transition-colors hover:border-taupe">
                <WatermarkPreview value={w} logoUrl={w.logoUrl} className="rounded-none" />
                <span className="block px-4 py-3">
                  <span className="block font-serif text-[18px]">{w.name}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {w.type === "TEXT" ? "Texto" : "Logo"} · {w.usedBy === 0 ? "não usada" : `em ${w.usedBy} ${w.usedBy === 1 ? "coleção" : "coleções"}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing ? <WatermarkDialog key={editing === "new" ? "new" : editing.id} open onOpenChange={(o) => !o && setEditing(null)} watermark={editing === "new" ? undefined : editing} /> : null}
    </>
  );
}
