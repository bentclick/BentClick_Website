"use client";

import Link from "next/link";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { FieldError, FieldHint, Input, Label, Select } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch-field";
import { DownloadQuality } from "@/generated/prisma/enums";
import { DOWNLOAD_QUALITY_LABELS, EXPIRY_PRESETS, EXPIRY_PRESET_LABELS } from "@/lib/constants/collection";
import type { CreateCollectionInput } from "@/lib/validation/collection";
import type { WatermarkOption } from "@/types/watermark";

type Props = { form: UseFormReturn<CreateCollectionInput>; watermarks: WatermarkOption[] };

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[13px] font-medium">{children}</p>;
}

/** Right column: access, client permissions and delivery. */
export function AccessFields({ form, watermarks }: Props) {
  const { errors } = form.formState;
  const [expiryPreset, requirePassword, quality] = useWatch({
    control: form.control,
    name: ["expiryPreset", "requirePassword", "downloadQuality"],
  });

  return (
    <div className="grid content-start gap-6">
      <div className="grid gap-2">
        <Label htmlFor="expiryPreset">Expiração</Label>
        <Select id="expiryPreset" {...form.register("expiryPreset")}>
          {EXPIRY_PRESETS.map((p) => (
            <option key={p} value={p}>
              {EXPIRY_PRESET_LABELS[p]}
            </option>
          ))}
        </Select>
        {expiryPreset === "custom" ? (
          <>
            <Input
              type="date"
              aria-label="Data de expiração"
              min={new Date().toISOString().slice(0, 10)}
              aria-invalid={!!errors.customExpiry}
              {...form.register("customExpiry")}
            />
            <FieldError message={errors.customExpiry?.message} />
          </>
        ) : null}
      </div>

      <div>
        <SwitchField id="isPrivate" label="Galeria privada" description="Acesso apenas por link, fora do site público." {...form.register("isPrivate")} />
        <SwitchField id="requirePassword" label="Exigir senha" {...form.register("requirePassword")} />
        {requirePassword ? (
          <div className="ml-[42px] mt-1 grid max-w-56 gap-1.5">
            <Input
              type="text"
              aria-label="Senha ou PIN da galeria"
              placeholder="Senha ou PIN"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>
        ) : null}
      </div>

      <div>
        <GroupLabel>Permissões do cliente</GroupLabel>
        <SwitchField id="allowFavorites" label="Permitir favoritos" {...form.register("allowFavorites")} />
        <SwitchField id="allowIndividualDownload" label="Download individual" {...form.register("allowIndividualDownload")} />
        <SwitchField id="allowFullDownload" label="Download da coleção" {...form.register("allowFullDownload")} />
        <SwitchField id="allowSharing" label="Compartilhamento" {...form.register("allowSharing")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="downloadQuality">Qualidade do download</Label>
        <Select id="downloadQuality" {...form.register("downloadQuality")}>
          {Object.values(DownloadQuality).map((value) => (
            <option key={value} value={value}>
              {DOWNLOAD_QUALITY_LABELS[value].label}
            </option>
          ))}
        </Select>
        <FieldHint>{DOWNLOAD_QUALITY_LABELS[quality].hint}</FieldHint>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="watermarkId">Marca d’água</Label>
        <Select id="watermarkId" {...form.register("watermarkId")}>
          <option value="">Sem marca d’água</option>
          {watermarks.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <FieldHint>
          Aplicada só nas pré-visualizações — o original nunca é alterado.{" "}
          <Link href="/dashboard/settings" className="text-foreground underline underline-offset-4">
            Criar marca d’água
          </Link>
        </FieldHint>
      </div>
    </div>
  );
}
