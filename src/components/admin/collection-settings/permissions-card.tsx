"use client";

import { useState } from "react";
import { updatePermissionsAction } from "@/actions/collection-settings.actions";
import { FieldHint, Label, Select } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import { DownloadQuality, GalleryLayout } from "@/generated/prisma/enums";
import { DOWNLOAD_QUALITY_LABELS } from "@/lib/constants/collection";
import type { CollectionSettingsView } from "@/types/collection-settings";
import { SettingsCard, useSave } from "./settings-card";

const LAYOUT_LABELS: Record<GalleryLayout, string> = { MASONRY: "Mosaico", EDITORIAL: "Editorial", GRID: "Grade" };

export function PermissionsCard({ collection }: { collection: CollectionSettingsView }) {
  const [form, setForm] = useState({
    allowFavorites: collection.allowFavorites,
    allowIndividualDownload: collection.allowIndividualDownload,
    allowFullDownload: collection.allowFullDownload,
    allowSharing: collection.allowSharing,
    downloadQuality: collection.downloadQuality,
    layout: collection.layout,
  });
  const { pending, save } = useSave();
  const toggle = (key: "allowFavorites" | "allowIndividualDownload" | "allowFullDownload" | "allowSharing") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));

  return (
    <SettingsCard
      id="permissoes"
      title="Cliente e entrega"
      description="O que o cliente pode fazer e como as fotos são entregues."
      pending={pending}
      onSave={() => save(() => updatePermissionsAction({ collectionId: collection.id, ...form }), "Permissões atualizadas")}
    >
      <div>
        <SwitchField id="perm-fav" label="Permitir favoritos" checked={form.allowFavorites} onChange={toggle("allowFavorites")} />
        <SwitchField id="perm-single" label="Download individual" checked={form.allowIndividualDownload} onChange={toggle("allowIndividualDownload")} />
        <SwitchField id="perm-full" label="Download da coleção (ZIP)" checked={form.allowFullDownload} onChange={toggle("allowFullDownload")} />
        <SwitchField id="perm-share" label="Compartilhamento" checked={form.allowSharing} onChange={toggle("allowSharing")} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="perm-quality">Qualidade do download</Label>
          <Select id="perm-quality" value={form.downloadQuality} onChange={(e) => setForm((f) => ({ ...f, downloadQuality: e.target.value as DownloadQuality }))}>
            {Object.values(DownloadQuality).map((q) => (
              <option key={q} value={q}>
                {DOWNLOAD_QUALITY_LABELS[q].label}
              </option>
            ))}
          </Select>
          <FieldHint>{DOWNLOAD_QUALITY_LABELS[form.downloadQuality].hint}</FieldHint>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="perm-layout">Layout da galeria</Label>
          <Select id="perm-layout" value={form.layout} onChange={(e) => setForm((f) => ({ ...f, layout: e.target.value as GalleryLayout }))}>
            {Object.values(GalleryLayout).map((l) => (
              <option key={l} value={l}>
                {LAYOUT_LABELS[l]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </SettingsCard>
  );
}
