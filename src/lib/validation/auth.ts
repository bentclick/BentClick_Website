import { z } from "zod";

/** Panel password rules, shared by sign-up, change and reset. */
export const panelPasswordSchema = z.string().min(10, "Use pelo menos 10 caracteres").max(128);

export const signInSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1, "Informe seu nome ou do estúdio").max(80),
  password: panelPasswordSchema,
});

export const resetPasswordSchema = z
  .object({ password: panelPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem" });

/** 6-digit authenticator code, or a backup code (letters, digits, dash). */
export const twoFactorCodeSchema = z.string().trim().regex(/^[A-Za-z0-9-]{6,24}$/, "Código inválido");

/** Sign-in variant with the same shape as sign-up so one form can switch modes. */
export const signInFormSchema = signInSchema.extend({ name: z.string() });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Only allow same-site relative redirects after login. */
export function safeNextPath(next: string | null | undefined): string {
  if (next && next.startsWith("/dashboard") && !next.startsWith("//")) return next;
  return "/dashboard/collections";
}
