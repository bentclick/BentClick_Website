import { z } from "zod";

/** Gallery password policy: shared by the server action and the settings form. */
export const galleryPasswordSchema = z
  .string()
  .trim()
  .min(8, "Use pelo menos 8 caracteres")
  .max(64)
  .regex(/\d/, "Inclua pelo menos um número")
  .regex(/[^A-Za-z0-9\s]/, "Inclua pelo menos um caractere especial (! @ # $ % …)");

const WORDS = [
  "Aurora", "Brisa", "Cedro", "Duna", "Estrela", "Flor", "Girassol", "Horizonte", "Ilha", "Jasmim", "Lago", "Luar",
  "Mar", "Neblina", "Oceano", "Pedra", "Praia", "Rio", "Serra", "Sol", "Trilha", "Vale", "Vento", "Ipê",
  "Orvalho", "Lua", "Cais", "Farol", "Jardim", "Nuvem", "Onda", "Pomar",
];
const SYMBOLS = "!@#$%&*?";

function pick(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % n;
}

/** Easy to dictate, hard to guess: Word-Word-1234! (passes the policy above). */
export function suggestGalleryPassword(): string {
  const digits = String(pick(10_000)).padStart(4, "0");
  return `${WORDS[pick(WORDS.length)]}-${WORDS[pick(WORDS.length)]}-${digits}${SYMBOLS[pick(SYMBOLS.length)]}`;
}
