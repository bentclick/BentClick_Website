import { NextRequest } from "next/server";
// @ts-expect-error -- Next does not publish types for the path-to-regexp it compiles in.
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";
import { cspHeaderName, publicCsp, PUBLIC_CSP_SOURCE, storageOrigins, STRICT_PREFIXES, strictCsp, summarizeCspReport } from "./csp";

const PROD = { NODE_ENV: "production", R2_ACCOUNT_ID: "acct", R2_BUCKET: "media" };
const STORAGE = "https://media.acct.r2.cloudflarestorage.com";

describe("policies", () => {
  it("strict: nonce and strict-dynamic, no eval in production", () => {
    const policy = strictCsp("abc", PROD);
    expect(policy).toContain("'nonce-abc'");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("both keep the hardening directives and the same storage host", () => {
    for (const policy of [publicCsp(PROD), strictCsp("n", PROD)]) {
      for (const directive of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) expect(policy).toContain(directive);
      expect(policy).toMatch(new RegExp(`img-src [^;]*${STORAGE}`));
      expect(policy).toMatch(new RegExp(`connect-src [^;]*${STORAGE}`));
    }
  });

  it("allows eval only in development", () => {
    expect(publicCsp({ NODE_ENV: "development" })).toContain("'unsafe-eval'");
    expect(publicCsp(PROD)).not.toContain("'unsafe-eval'");
  });

  it("never widens storage to every R2 customer", () => {
    expect(storageOrigins(PROD)).toEqual([STORAGE]);
    expect(publicCsp(PROD)).not.toContain("*");
  });

  it("uses the local endpoint origin when set", () => {
    expect(storageOrigins({ R2_ENDPOINT: "http://127.0.0.1:59090/x" })).toEqual(["http://127.0.0.1:59090"]);
  });

  it("switches to report-only with the emergency variable", () => {
    expect(cspHeaderName({ CSP_REPORT_ONLY: "1" })).toBe("Content-Security-Policy-Report-Only");
    expect(cspHeaderName({})).toBe("Content-Security-Policy");
  });
});

describe("routing", () => {
  const publicSource: RegExp = pathToRegexp(PUBLIC_CSP_SOURCE, [], { strict: true, sensitive: false, delimiter: "/" });

  it("public source skips strict areas, by whole segment", () => {
    for (const path of ["/dashboard", "/dashboard/collections", "/login", "/g/abc"]) expect(publicSource.test(path)).toBe(false);
    for (const path of ["/", "/portfolio", "/gallery", "/loginx"]) expect(publicSource.test(path)).toBe(true);
  });

  it("proxy matcher covers exactly the strict prefixes", () => {
    const roots = config.matcher.map((m) => m.split("/")[1]);
    expect(new Set(roots)).toEqual(new Set(STRICT_PREFIXES));
  });

  function nonceOf(response: Response) {
    return /'nonce-([^']+)'/.exec(response.headers.get("content-security-policy") ?? "")?.[1];
  }

  it("gives each response its own nonce and passes it to Next on the request", () => {
    const first = proxy(new NextRequest("https://x.test/g/abc"));
    const second = proxy(new NextRequest("https://x.test/g/abc"));
    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
    expect(first.headers.get("x-middleware-request-content-security-policy")).toContain(`'nonce-${nonceOf(first)}'`);
  });
});

describe("summarizeCspReport", () => {
  it("drops query strings, which hold tokens and signatures", () => {
    const summary = summarizeCspReport(
      JSON.stringify({ "csp-report": { "document-uri": "https://x.test/g/a?token=SECRET", "violated-directive": "img-src", "blocked-uri": "https://evil.test/p.png?X-Amz-Signature=SECRET" } }),
    );
    expect(JSON.stringify(summary)).not.toContain("SECRET");
    expect(summary).toEqual({ page: "https://x.test/g/a", directive: "img-src", blocked: "https://evil.test/p.png" });
  });

  it("ignores unreadable bodies", () => {
    expect(summarizeCspReport("{not json")).toBeNull();
    expect(summarizeCspReport("{}")).toBeNull();
    expect(summarizeCspReport(JSON.stringify({ "csp-report": { "blocked-uri": "eval" } }))).toBeNull();
  });
});
