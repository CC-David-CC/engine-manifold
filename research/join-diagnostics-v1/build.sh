#!/usr/bin/env bash
# Separate experimental native build; never writes an application asset cache.
set -euo pipefail
SOURCE=/path/to/manifold-source
BUILD=/path/to/manifold-build
PREREQUISITES=/path/to/manifold-prerequisites
git -C "$SOURCE" merge-base --is-ancestor 31afd71d17c7a94cfaeada83f657d7b42628ead6 HEAD
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
