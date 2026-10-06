"use client";

import { useState } from "react";
import { updateGalleryDefaultsAction } from "@/actions/settings.actions";
import { SettingsCard, useSave } from "@/components/admin/collection-settings/settings-card";
import { Label, Select } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import { DownloadQuality, GalleryLayout } from "@/generated/prisma/enums";
import { DOWNLOAD_QUALITY_LABELS } from "@/lib/constants/collection";
import type { GalleryDefaultsInput } from "@/lib/validation/settings";

const LAYOUTS: Record<GalleryLayout, string> = { MASONRY: "Mosaico", EDITORIAL: "Editorial", GRID: "Grade" };
const EXPIRY = [0, 7, 15, 30, 60, 90] as const;

export function DefaultsCard({ initial, watermarks }: { initial: GalleryDefaultsInput; watermarks: { id: string; name: string }[] }) {
  const [form, setForm] = useState(initial);
  const { pending, save } = useSave();
  const toggle = (key: "defaultAllowFavorites" | "defaultAllowIndividualDownload" | "defaultAllowFullDownload" | "defaultAllowSharing") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));

  return (
    <SettingsCard
      id="padroes"
      title="Padrões de galeria"
      description="Pré-preenchem cada nova coleção. Coleções existentes não mudam."
      pending={pending}
      onSave={() => save(() => updateGalleryDefaultsAction(form), "Padrões salvos")}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="def-expiry">Expiração</Label>
          <Select id="def-expiry" value={form.defaultExpiryDays} onChange={(e) => setForm((f) => ({ ...f, defaultExpiryDays: Number(e.target.value) as GalleryDefaultsInput["defaultExpiryDays"] }))}>
            {EXPIRY.map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "Nunca expira" : `${d} dias`}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="def-layout">Layout</Label>
          <Select id="def-layout" value={form.defaultLayout} onChange={(e) => setForm((f) => ({ ...f, defaultLayout: e.target.value as GalleryLayout }))}>
            {Object.values(GalleryLayout).map((l) => (
              <option key={l} value={l}>
                {LAYOUTS[l]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="def-quality">Qualidade do download</Label>
          <Select id="def-quality" value={form.defaultDownloadQuality} onChange={(e) => setForm((f) => ({ ...f, defaultDownloadQuality: e.target.value as DownloadQuality }))}>
            {Object.values(DownloadQuality).map((q) => (
              <option key={q} value={q}>
                {DOWNLOAD_QUALITY_LABELS[q].label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="def-watermark">Marca d’água</Label>
          <Select id="def-watermark" value={form.defaultWatermarkId} onChange={(e) => setForm((f) => ({ ...f, defaultWatermarkId: e.target.value }))}>
            <option value="">Sem marca d’água</option>
            {watermarks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <SwitchField id="def-fav" label="Permitir favoritos" checked={form.defaultAllowFavorites} onChange={toggle("defaultAllowFavorites")} />
        <SwitchField id="def-single" label="Download individual" checked={form.defaultAllowIndividualDownload} onChange={toggle("defaultAllowIndividualDownload")} />
        <SwitchField id="def-full" label="Download da coleção (ZIP)" checked={form.defaultAllowFullDownload} onChange={toggle("defaultAllowFullDownload")} />
        <SwitchField id="def-share" label="Compartilhamento" checked={form.defaultAllowSharing} onChange={toggle("defaultAllowSharing")} />
      </div>
    </SettingsCard>
  );
}
