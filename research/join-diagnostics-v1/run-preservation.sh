#!/usr/bin/env bash
set -euo pipefail
SOURCE=/path/to/manifold-source
BUILD=/path/to/manifold-build
source /path/to/manifold-prerequisites/emsdk/emsdk_env.sh
sha256sum "$BUILD/src/libmanifold.a" "$BUILD/_deps/clipper2-build/libClipper2.a" > "$BUILD/probe-archives.sha256"
em++ -std=c++17 -O1 -DMANIFOLD_CROSS_SECTION -DMANIFOLD_PAR=-1 \
 -I"$SOURCE/include" -I"$BUILD/include" \
 "$SOURCE/research/join-diagnostics-v1/preservation.cpp" \
 "$BUILD/src/libmanifold.a" "$BUILD/_deps/clipper2-build/libClipper2.a" \
 -sENVIRONMENT=node -sWASM_ASYNC_COMPILATION=0 \
 -o "$BUILD/preservation.cjs"
node "$BUILD/preservation.cjs" > "$BUILD/preservation.json"
sha256sum -c "$BUILD/probe-archives.sha256"
