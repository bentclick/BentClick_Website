import { z } from "zod";

/**
 * Everything editable on the public website (docs/ARCHITECTURE.md §9a).
 * Every field has a default, so an empty document renders today's site and a
 * partially stored document never breaks a page. Copy in components is only
 * ever a fallback through these defaults.
 */

const text = (max: number, fallback: string) => z.string().trim().max(max).catch(fallback).default(fallback);
const optionalText = (max: number) => z.string().trim().max(max).catch("").default("");

export const HOME_SECTIONS = ["works", "about", "contact"] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export const HOME_SECTION_LABELS: Record<HomeSection, string> = {
  works: "Trabalhos (fotos do portfólio)",
  about: "Sobre (resumo)",
  contact: "Chamada para contato",
};

const homeSectionSchema = z.object({ type: z.enum(HOME_SECTIONS), visible: z.boolean().catch(true).default(true) });

export const siteContentSchema = z.object({
  hero: z
    .object({
      title: text(120, "Histórias\nem imagens\nreais."),
      subtitle: text(300, "Fotografia de pessoas, histórias e momentos que merecem ser lembrados."),
      primaryLabel: text(40, "Ver portfólio"),
      secondaryLabel: text(40, "Área do cliente"),
      showSecondary: z.boolean().catch(true).default(true),
      /** Portfolio image ids; empty → album covers. */
      imageIds: z.array(z.string().max(40)).max(5).catch([]).default([]),
      overlay: z.number().min(0).max(0.8).catch(0.45).default(0.45),
    })
    .prefault({}),
  works: z
    .object({
      eyebrow: text(40, "Trabalhos"),
      heading: text(160, "Pessoas, lugares e o que acontece entre eles."),
      line: text(240, "Casamentos · Eventos · Retratos · Ensaios · Corporativo · Produtos · Viagens"),
      buttonLabel: text(40, "Ver portfólio completo"),
      count: z.number().int().min(4).max(24).catch(12).default(12),
    })
    .prefault({}),
  about: z
    .object({
      eyebrow: text(40, "Sobre"),
      title: text(120, ""),
      tagline: optionalText(200),
      text: text(
        4000,
        "Fotografia de pessoas, histórias e momentos que merecem ser lembrados — de casamentos e eventos a retratos, ensaios, trabalhos corporativos, produtos e viagens.",
      ),
      buttonLabel: text(40, "Fale comigo"),
    })
    .prefault({}),
  contact: z
    .object({
      eyebrow: text(40, "Contato"),
      heading: text(160, "Vamos contar a sua história."),
      text: text(600, "Conte um pouco sobre a data, o lugar e o que você imagina. Respondo pessoalmente."),
      email: optionalText(254),
      instagram: optionalText(60),
      whatsapp: optionalText(30),
      // Rendered as a link: only http(s), never javascript: or data: (anything else is dropped, field by field).
      website: z.string().trim().max(200).refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v)).catch("").default(""),
      // Contact form (messages arrive in the dashboard as leads).
      showForm: z.boolean().catch(true).default(true),
      formHeading: text(120, "Envie uma mensagem"),
      formText: optionalText(300),
      formButton: text(40, "Enviar mensagem"),
      successTitle: text(120, "Mensagem enviada!"),
      successText: text(300, "Obrigado pelo contato. Respondo em breve pelo e-mail ou WhatsApp que você informou."),
    })
    .prefault({}),
  clientArea: z
    .object({
      heading: text(160, "Sua galeria está esperando."),
      text: text(400, "Use o link enviado por e-mail. Sem cadastro: se a galeria tiver senha, ela será pedida na próxima tela."),
    })
    .prefault({}),
  home: z
    .object({
      sections: z
        .array(homeSectionSchema)
        .catch([])
        .default([])
        .transform((list) => {
          // Keep stored order, drop duplicates, append any section type the document doesn't know yet.
          const seen = new Set<HomeSection>();
          const ordered = list.filter((s) => (seen.has(s.type) ? false : (seen.add(s.type), true)));
          for (const type of HOME_SECTIONS) if (!seen.has(type)) ordered.push({ type, visible: type === "works" });
          return ordered;
        }),
    })
    .prefault({}),
  footer: z.object({ line: optionalText(200) }).prefault({}),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type SiteContentInput = z.input<typeof siteContentSchema>;

/** Never throws: unknown/invalid stored data falls back field by field. */
export function parseSiteContent(raw: unknown): SiteContent {
  const result = siteContentSchema.safeParse(raw ?? {});
  return result.success ? result.data : siteContentSchema.parse({});
}

export const accentSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB");
