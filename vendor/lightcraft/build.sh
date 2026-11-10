#!/usr/bin/env bash
# Builds the editor served at /lightcraft/<version>: the official LightCraft tag plus the patches in ./patches.
# Usage: vendor/lightcraft/build.sh <empty work dir>
# Needs git, rustup (the toolchain is installed here) and Python. It takes a few minutes.
set -euo pipefail

TAG=v0.20.0
VERSION=0.20.0-bentclick.1   # keep equal to LIGHTCRAFT_VERSION in src/lib/security/csp.ts
HERE="$(cd "$(dirname "$0")" && pwd)"
SITE="$(cd "$HERE/../.." && pwd)"
WORK="${1:?usage: build.sh <empty work dir>}"
OUT="$SITE/public/lightcraft/$VERSION"

# autocrlf off: the patches have LF line endings, as the repository does
git clone --quiet --depth 1 --branch "$TAG" -c core.autocrlf=false https://github.com/storytold/lightcraft.git "$WORK"
cd "$WORK"
git apply "$HERE"/patches/*.patch

rustup toolchain install 1.95 --profile minimal
rustup target add wasm32-unknown-unknown --toolchain 1.95
WASM_BINDGEN=$(grep -A1 '^name = "wasm-bindgen"$' Cargo.lock | sed -n 's/version = "\(.*\)"/\1/p')
wasm-bindgen --version 2>/dev/null | grep -q "$WASM_BINDGEN" || cargo +1.95 install wasm-bindgen-cli --version "$WASM_BINDGEN" --locked
cargo +1.95 xtask web

# Only what the browser loads, plus the licences. The ArtCraft marks are removed by patch 0002 (brand licence).
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r target/web-site/{index.html,lightcraft_web.js,lightcraft_web_bg.wasm,worker.js,snippets} "$OUT/"
cp LICENSE-MIT LICENSE-APACHE NOTICE assets/fonts/OFL-Inter.txt "$OUT/"

echo "Built $OUT"
echo "If index.html's inline script changed, update LIGHTCRAFT_INLINE_SCRIPT_HASH (the csp test prints the new one)."
