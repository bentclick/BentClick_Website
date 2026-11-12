import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain build script, no types
import { hashArtifacts } from "../../../vendor/lightcraft/hash-artifacts.mjs";
import { LIGHTCRAFT_VERSION } from "./csp";

/**
 * The editor runs inside the dashboard's origin, with the photographer's session: whatever is in
 * public/lightcraft/<version> can call the site's APIs as them. So the served files must be exactly the ones built by
 * vendor/lightcraft/build.sh from the audited commit; a swapped or edited file fails here.
 */
describe("LightCraft build in public/", () => {
  it("matches the hashes recorded when it was built", () => {
    const site = process.cwd();
    const recorded = JSON.parse(readFileSync(join(site, "vendor/lightcraft/SHA256SUMS.json"), "utf8")) as Record<string, string>;
    expect(Object.keys(recorded).every((k) => k.startsWith(`${LIGHTCRAFT_VERSION}/`))).toBe(true);
    expect(hashArtifacts(join(site, "public/lightcraft"), LIGHTCRAFT_VERSION)).toEqual(recorded);
  });
});
