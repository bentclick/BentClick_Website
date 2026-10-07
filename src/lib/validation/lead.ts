import { z } from "zod";
import { CollectionCategory, LeadStatus } from "@/generated/prisma/enums";

/** Public contact form. `website` is a honeypot: people never see it, bots fill it. */
export const leadSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(120),
  email: z.email("Informe um e-mail válido").max(254),
  phone: z.string().trim().max(30).regex(/^[\d\s()+-]*$/, "Use só números, espaços, ( ) + -").default(""),
  eventType: z.union([z.enum(CollectionCategory), z.literal("")]).default(""),
  eventDate: z.union([z.iso.date("Data inválida"), z.literal("")]).default(""),
  message: z.string().trim().min(10, "Conte um pouco mais (pelo menos 10 caracteres)").max(3000),
  website: z.string().max(200).default(""),
});

export const leadStatusSchema = z.enum(LeadStatus);

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadFormValues = z.input<typeof leadSchema>;
