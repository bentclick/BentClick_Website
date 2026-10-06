import type { ActivityType } from "@/generated/prisma/enums";

/** Human sentence for a timeline entry; `who` is the client name when known. */
export function describeActivity(type: ActivityType, who: string | null, metadata: Record<string, unknown> | null): string {
  const client = who ?? "Um visitante";
  switch (type) {
    case "GALLERY_VIEWED":
      return `${client} abriu a galeria`;
    case "PHOTO_FAVORITED":
      return `${client} favoritou uma foto`;
    case "PHOTO_UNFAVORITED":
      return `${client} removeu uma foto dos favoritos`;
    case "SELECTION_SUBMITTED":
      return `${client} enviou a seleção (${metadata?.count ?? "?"} fotos)`;
    case "PHOTO_DOWNLOADED":
      return `${client} baixou uma foto`;
    case "ARCHIVE_DOWNLOADED":
      return `${client} baixou ${metadata?.scope === "FAVORITES" ? "as favoritas" : "a galeria"}${Number(metadata?.of) > 1 ? ` (parte ${metadata?.part} de ${metadata?.of})` : ""}`;
    case "EMAIL_SENT":
      return `Galeria enviada por e-mail para ${metadata?.recipient ?? "o cliente"}`;
    case "COLLECTION_PUBLISHED":
      return "Galeria publicada";
    case "COLLECTION_UNPUBLISHED":
      return "Galeria movida para rascunhos";
    case "COLLECTION_ARCHIVED":
      return "Coleção arquivada";
    case "COLLECTION_EXPIRED":
      return "Galeria expirou";
    case "EXPIRATION_CHANGED":
      return metadata?.reactivated ? "Expiração alterada — galeria reativada" : "Expiração alterada";
    case "LINK_REGENERATED":
      return "Novo link gerado";
    case "LINK_DISABLED":
      return "Link desativado";
    case "PASSWORD_CHANGED":
      return metadata?.enabled ? "Senha definida ou alterada" : "Senha removida";
  }
}

export const DOWNLOAD_KIND_LABELS: Record<string, string> = { PHOTO: "Foto", ALL: "Galeria completa", FAVORITES: "Favoritas", GALLERY: "Galeria" };
