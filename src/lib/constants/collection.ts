import { CollectionCategory, CollectionStatus, DownloadQuality } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<CollectionCategory, string> = {
  WEDDING: "Casamento",
  ENGAGEMENT: "Noivado",
  EVENT: "Evento",
  BIRTHDAY: "Aniversário",
  CORPORATE: "Corporativo",
  GRADUATION: "Formatura",
  PORTRAIT: "Retrato",
  SESSION: "Ensaio",
  FAMILY: "Família",
  PRODUCT: "Produto",
  TRAVEL: "Viagem",
  OTHER: "Outro",
};

export const CATEGORY_OPTIONS = Object.values(CollectionCategory).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  EXPIRED: "Expirado",
  ARCHIVED: "Arquivado",
};

export const STATUS_OPTIONS = Object.values(CollectionStatus).map((value) => ({ value, label: STATUS_LABELS[value] }));

export const DOWNLOAD_QUALITY_LABELS: Record<DownloadQuality, { label: string; hint: string }> = {
  ORIGINAL: { label: "Original", hint: "Arquivo exatamente como enviado" },
  HIGH_RES: { label: "Alta resolução", hint: "3600 px no lado maior, ideal para impressão" },
  WEB: { label: "Otimizada para web", hint: "2048 px, leve para compartilhar" },
};

export const EXPIRY_PRESETS = ["never", "7", "15", "30", "60", "90", "custom"] as const;
export type ExpiryPreset = (typeof EXPIRY_PRESETS)[number];

export const EXPIRY_PRESET_LABELS: Record<ExpiryPreset, string> = {
  never: "Nunca expira",
  "7": "7 dias",
  "15": "15 dias",
  "30": "30 dias",
  "60": "60 dias",
  "90": "90 dias",
  custom: "Data personalizada",
};

/** Published collections expiring within this many days get an "Expira em N dias" badge. */
export const EXPIRY_WARNING_DAYS = 15;

export const DEFAULT_GALLERY_NAME = "Destaques";
