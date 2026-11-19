#!/usr/bin/env bash
set -euo pipefail
SOURCE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
BUILD=$(realpath -m -- "${CODI_MANIFOLD_BUILD_DIR:?Set CODI_MANIFOLD_BUILD_DIR to an external build directory}")
PREREQUISITES=$(realpath -- "${CODI_MANIFOLD_PREREQUISITES:?Set CODI_MANIFOLD_PREREQUISITES to the emsdk and clipper2 parent directory}")
case "$BUILD/" in
  "$SOURCE/"*) printf '%s\n' 'Build directory must be outside the checkout.' >&2; exit 1 ;;
esac
source "$PREREQUISITES/emsdk/emsdk_env.sh"
sha256sum "$BUILD/src/libmanifold.a" "$BUILD/_deps/clipper2-build/libClipper2.a" > "$BUILD/probe-archives.sha256"
em++ -std=c++17 -O1 -DMANIFOLD_CROSS_SECTION -DMANIFOLD_PAR=-1 \
 -I"$SOURCE/include" -I"$BUILD/include" \
 "$SOURCE/research/join-diagnostics-v1/preservation.cpp" \
 "$BUILD/src/libmanifold.a" "$BUILD/_deps/clipper2-build/libClipper2.a" \
 -sENVIRONMENT=node -sWASM_ASYNC_COMPILATION=0 \
 -o "$BUILD/preservation.cjs"
"${CODI_NODE:-node}" "$BUILD/preservation.cjs" > "$BUILD/preservation.json"
sha256sum -c "$BUILD/probe-archives.sha256"
