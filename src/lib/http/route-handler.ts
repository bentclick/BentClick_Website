import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError } from "@/lib/auth/session";
import { DomainError, NotFoundError } from "@/services/errors";

/**
 * Mutating route handlers only accept same-origin requests (CSRF defence —
 * Server Actions get this from Next; plain route handlers don't).
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new UnauthorizedError();
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("BAD_JSON", "Requisição inválida.");
  }
  return schema.parse(body);
}

/** Maps domain errors to HTTP responses; never leaks internals. */
export function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  if (error instanceof NotFoundError) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  if (error instanceof DomainError) {
    const status = error.code === "RATE_LIMITED" ? 429 : error.code === "STORAGE_UNAVAILABLE" ? 503 : 422;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("[route] unexpected error", error);
  return NextResponse.json({ error: "Algo deu errado. Tente novamente." }, { status: 500 });
}
