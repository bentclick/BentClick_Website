// SHA-256 of every file of a LightCraft build in public/lightcraft/<version>, as checked by
// src/lib/security/lightcraft-artifacts.test.ts. Text files are hashed with LF line endings, so a Windows checkout
// (CRLF) and the Linux build machine agree; binary files as they are.
// Usage: node vendor/lightcraft/hash-artifacts.mjs <version>   (prints the JSON written to SHA256SUMS.json)
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const TEXT = /\.(html|js|txt|json|css)$|(^|\/)(LICENSE-[A-Z]+|NOTICE)$/;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** { "<version>/<path>": "<sha256>" } for one build directory, keys sorted. */
export function hashArtifacts(lightcraftDir, version) {
  const root = join(lightcraftDir, version);
  const entries = files(root).map((path) => {
    const key = `${version}/${relative(root, path).split(sep).join("/")}`;
    const bytes = readFileSync(path);
    const body = TEXT.test(key) ? Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8") : bytes;
    return [key, createHash("sha256").update(body).digest("hex")];
  });
  return Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : 1)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = join(fileURLToPath(import.meta.url), "..", "..", "..");
  process.stdout.write(`${JSON.stringify(hashArtifacts(join(site, "public", "lightcraft"), process.argv[2]), null, 2)}\n`);
}
