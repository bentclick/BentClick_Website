/**
 * Content-Security-Policy: the browser only runs scripts and talks to hosts
 * declared here, so injected content cannot act or send data elsewhere.
 *
 * Two policies, one host list. Areas with a session or client data get a nonce
 * per response (src/proxy.ts). The public site is cached, so it cannot carry a
 * nonce and allows Next's inline bootstrap, still limited to this origin.
 *
 * Imported by next.config.ts: no path aliases and no server-only here.
 * CSP_REPORT_ONLY=1 is the emergency exit: it reports instead of blocking.
 */

/** Keep equal to the matcher in src/proxy.ts (a test compares them); Next requires that one to be literal. */
export const STRICT_PREFIXES = ["dashboard", "login", "esqueci-senha", "redefinir-senha", "g"] as const;

/** The RAW editor, our build of LightCraft (vendor/lightcraft): public/lightcraft/<version>. Bumping it means testing it first. */
export const LIGHTCRAFT_VERSION = "0.20.0-bentclick.2";
export const LIGHTCRAFT_BASE = `/lightcraft/${LIGHTCRAFT_VERSION}`;
/** Its only inline script; csp.test.ts recomputes this from the file. */
export const LIGHTCRAFT_INLINE_SCRIPT_HASH = "sha256-4HgEuelxRDuqDvdKlQvpBManpPXKzOs1Wui7fv3wL/w=";

/** Excludes the strict areas and the editor: two policies on one response would both apply. */
export const PUBLIC_CSP_SOURCE = `/:path((?!(?:${[...STRICT_PREFIXES, "lightcraft"].join("|")})(?:/|$)).*)`;

export const CSP_REPORT_PATH = "/api/csp-report";

type Env = Record<string, string | undefined>;

/** Signed photo URLs and direct uploads: exactly our bucket, since a wildcard would admit any R2 customer. */
export function storageOrigins(env: Env = process.env): string[] {
  if (env.R2_ENDPOINT) return [new URL(env.R2_ENDPOINT).origin];
  if (env.R2_ACCOUNT_ID && env.R2_BUCKET) return [`https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`];
  return [];
}

function build(scriptSources: string[], env: Env, dev: boolean): string {
  const storage = storageOrigins(env);
  return [
    "default-src 'self'",
    `script-src ${[...scriptSources, ...(dev ? ["'unsafe-eval'"] : [])].join(" ")}`,
    // Inline style attributes carry the editable site colours and photo placeholders.
    "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", "data:", "blob:", ...storage].join(" ")}`,
    "font-src 'self'",
    `connect-src ${["'self'", ...storage, ...(dev ? ["ws:"] : [])].join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ");
}

const isDev = (env: Env) => env.NODE_ENV !== "production";

export function publicCsp(env: Env = process.env): string {
  return build(["'self'", "'unsafe-inline'"], env, isDev(env));
}

/** 'unsafe-inline' and https: are fallbacks for old browsers; nonce + strict-dynamic make modern ones ignore them. */
export function strictCsp(nonce: string, env: Env = process.env): string {
  return build([`'nonce-${nonce}'`, "'strict-dynamic'", "'unsafe-inline'", "https:"], env, isDev(env));
}

/**
 * The editor runs in a frame of our own panel and shares its origin, so it gets
 * the narrowest policy that lets it work: WebAssembly but never eval, and no
 * network beyond its own files. The panel talks to storage, the editor doesn't.
 */
export function lightcraftCsp(): string {
  return [
    "default-src 'none'",
    `script-src 'self' '${LIGHTCRAFT_INLINE_SCRIPT_HASH}' 'wasm-unsafe-eval'`,
    "worker-src 'self'",
    "style-src 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ");
}

export function cspHeaderName(env: Env = process.env): string {
  return env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}

const clip = (value: unknown) => (typeof value === "string" ? value.slice(0, 200) : "");

function withoutQuery(value: unknown): string {
  const text = clip(value);
  try {
    const url = new URL(text);
    return url.origin + url.pathname;
  } catch {
    return text;
  }
}

/** Gallery links and signed URLs carry secrets in the query, so only origin + path may reach the logs. */
export function summarizeCspReport(body: string): { page: string; directive: string; blocked: string } | null {
  try {
    const report = (JSON.parse(body) as { "csp-report"?: Record<string, unknown> })["csp-report"];
    // Zod probes `new Function` once and handles the refusal: expected on every page, and eval stays blocked regardless.
    if (!report || report["blocked-uri"] === "eval") return null;
    return { page: withoutQuery(report["document-uri"]), directive: clip(report["violated-directive"]), blocked: withoutQuery(report["blocked-uri"]) };
  } catch {
    return null;
  }
}
