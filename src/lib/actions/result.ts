import "server-only";
import { z } from "zod";
import { UnauthorizedError } from "@/lib/auth/session";
import { DomainError, NotFoundError } from "@/services/errors";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/**
 * Maps thrown errors to a serialisable result. Unknown errors are logged and
 * replaced with a generic message so internals never reach the browser.
 */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return { ok: false, error: "Confira os campos destacados.", fieldErrors: z.flattenError(error).fieldErrors };
  }
  if (error instanceof DomainError) return { ok: false, error: error.message };
  if (error instanceof NotFoundError) return { ok: false, error: "Este item não existe mais." };
  if (error instanceof UnauthorizedError) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  console.error("[action] unexpected error", error);
  return { ok: false, error: "Algo deu errado. Tente novamente." };
}
