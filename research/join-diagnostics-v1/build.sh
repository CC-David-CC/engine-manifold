#!/usr/bin/env bash
# Separate experimental native build; never writes an application asset cache.
set -euo pipefail
SOURCE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
BUILD=$(realpath -m -- "${CODI_MANIFOLD_BUILD_DIR:?Set CODI_MANIFOLD_BUILD_DIR to an external build directory}")
PREREQUISITES=$(realpath -- "${CODI_MANIFOLD_PREREQUISITES:?Set CODI_MANIFOLD_PREREQUISITES to the emsdk and clipper2 parent directory}")
case "$BUILD/" in
  "$SOURCE/"*) printf '%s\n' 'Build directory must be outside the checkout.' >&2; exit 1 ;;
esac
git -C "$SOURCE" merge-base --is-ancestor 78d4045d2ac2ba58d888e4a8de61fd5457f9a535 HEAD
test "$(git -C "$PREREQUISITES/clipper2" rev-parse HEAD)" = 46f639177fe418f9689e8ddb74f08a870c71f5b4
test -z "$(git -C "$PREREQUISITES/clipper2" status --porcelain)"
mkdir -p "$BUILD"
cd "$SOURCE"
sha256sum include/manifold/manifold.h src/manifold.cpp bindings/wasm/bindings.cpp src/properties.cpp > "$BUILD/sources-before.sha256"
source "$PREREQUISITES/emsdk/emsdk_env.sh"
emcc --version > "$BUILD/compiler.txt"
emcmake cmake -S "$SOURCE" -B "$BUILD" \
 -DCMAKE_BUILD_TYPE=MinSizeRel -DMANIFOLD_PAR=OFF -DMANIFOLD_TEST=OFF \
 -DMANIFOLD_CBIND=OFF -DMANIFOLD_JSBIND=ON \
 -DMANIFOLD_USE_BUILTIN_CLIPPER2=ON -DMANIFOLD_DOWNLOADS=ON \
 -DFETCHCONTENT_FULLY_DISCONNECTED=ON \
 -DFETCHCONTENT_SOURCE_DIR_CLIPPER2="$PREREQUISITES/clipper2" \
 '-DCMAKE_EXE_LINKER_FLAGS=-sDYNAMIC_EXECUTION=0 -sEMBIND_AOT=1'
cmake --build "$BUILD" --target manifoldjs --parallel 4
sha256sum -c "$BUILD/sources-before.sha256"
sha256sum "$BUILD/bindings/wasm/manifold.js" "$BUILD/bindings/wasm/manifold.wasm" > "$BUILD/runtime.sha256"
read -r JS_SHA _ < <(sha256sum < "$BUILD/bindings/wasm/manifold.js")
read -r WASM_SHA _ < <(sha256sum < "$BUILD/bindings/wasm/manifold.wasm")
printf '{"jsSha256":"%s","wasmSha256":"%s"}\n' "$JS_SHA" "$WASM_SHA" > "$BUILD/pins.json"
