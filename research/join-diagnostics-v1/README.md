# Experimental native Manifold diagnostics

Separate upstream base: `31afd71d17c7a94cfaeada83f657d7b42628ead6`. The current application/runtime/cache is unchanged. Earlier investigation: JSKetcher `4a886f94b`, branch `review/manifold-join-investigation-20261106`, both LANs.

Only three native product files change: `include/manifold/manifold.h`, `src/manifold.cpp`, `bindings/wasm/bindings.cpp`. Existing algorithms in `src/properties.cpp` and `src/impl.h` are unchanged. No geometry repair, tolerance adjustment, mesh roundtrip, JS classifier, or Join success policy is added.

## API

All four methods are const native members, exposed directly by embind.

| Native member | WASM instance method | Observation |
|---|---|---|
| `NativeIs2ManifoldDiagnostic()` | `nativeIs2ManifoldDiagnostic()` | Existing oriented halfedge/topology check. |
| `NativeIsSelfIntersectingDiagnostic()` | `nativeIsSelfIntersectingDiagnostic()` | Existing intersection diagnostic; skips epsilon-close vertices and marginal contacts. **Not strict self-contact certification.** |
| `NativeEpsilonDiagnostic()` | `nativeEpsilonDiagnostic()` | Actual epsilon; empty Impl's retained sentinel is `-1`. |
| `NativeBoundaryMinGapDiagnostic(other,searchLength)` | `nativeBoundaryMinGapDiagnostic(other,searchLength)` | Existing double native triangle-boundary distance, capped by positive finite searchLength, without public MinGap's solid-intersection shortcut. Empty boundary or invalid search returns NaN. |

Like existing readers, calls can materialize lazy CSG. No app resource admission is added; a future Worker must retain its operation/geometry limits. A boundary gap is not itself an orientation/nesting/connected-solid certificate.

## Actual native evidence

`probe.mjs`: 18 actual WASM shapes, including ordinary overlap/face/edge/point/disjoint unions, proper/touching cavities, separated/touching voids, through-hole, diagnostic warps, empty. All wrappers released. Read-only before/after snapshots cover native reported metrics/tolerance/epsilon plus exported Float32 mesh hashes. Those mesh hashes are preservation observations, not an exact native geometry certificate.

`preservation.cpp`: linked to the **same native archive** used by the experimental embind build. Passes 16 shapes, 44 bitwise double MeshGL64 snapshots (all exposed arrays including source/run/face/tangent data), 16 two-input distance pairs, four invalid bounds. Native volume/tolerance/epsilon unchanged. No private internal heap identity claim.

| Actual geometry | Boundary distance | Other diagnostics |
|---|---|---|
| Proper cavity in box | 4 | Public solid MinGap is 0. |
| Proper cavity in notched box | sqrt(12) | Public solid MinGap is 0. |
| Cavity touches exterior at point/edge | 0 | Topology true; self-intersection false. |
| Two separated voids | sqrt(12) | One positive + two negative boundaries. |
| Two point/edge-touching voids | 0 | Same signed component census. |
| Coincident nonadjacent warped corners | n/a | One positive; topology true; self-intersection false. Outside public construction scope. |
| Crossing warped corner | n/a | Self-intersection true. Outside public construction scope. |

`same-boundary.mjs`: three further **box/Boolean-only** observations. In a 30-cube, subtract a notch at (-1,-1,-1) of size (16,16,16). A second notch at (15,15,15), size (16,16,16), touches the first void at a point; one at (15,15,-1), size (16,16,32), touches along an edge. Both native results have ONE positive component, NoError, topology true, self-intersection false. Volumes are analytically 20250/16875. Separated control volume20881 has the same flags. Inter-component gap cannot diagnose self-contact **within one boundary**. No mesh classifier qualifies these observations.

**Strict Manifold Join remains JOIN_UNQUALIFIED.** These methods close a visibility gap but do not supply the missing strict geometric-embedding/topological-adjacency predicate. No browser/Worker/public history/save/open or runtime promotion is claimed.

## Reproduce

Provide Emscripten 5.0.2 and the pinned Clipper2 checkout
`46f639177fe418f9689e8ddb74f08a870c71f5b4` under a directory with
`emsdk/` and `clipper2/` subdirectories. Set these paths from the checkout:

```sh
export CODI_MANIFOLD_PREREQUISITES=/path/to/prerequisites
export CODI_MANIFOLD_BUILD_DIR=/path/to/manifold-diagnostics-build
bash research/join-diagnostics-v1/build.sh
bash research/join-diagnostics-v1/run-preservation.sh

export CODI_MANIFOLD_GLUE="$CODI_MANIFOLD_BUILD_DIR/manifold.mjs"
export CODI_MANIFOLD_WASM="$CODI_MANIFOLD_BUILD_DIR/bindings/wasm/manifold.wasm"
export CODI_NATIVE_PINS="$CODI_MANIFOLD_BUILD_DIR/pins.json"
cp "$CODI_MANIFOLD_BUILD_DIR/bindings/wasm/manifold.js" "$CODI_MANIFOLD_GLUE"
CODI_OBSERVATION="$CODI_MANIFOLD_BUILD_DIR/observed-r2.json" node research/join-diagnostics-v1/probe.mjs
CODI_OBSERVATION="$CODI_MANIFOLD_BUILD_DIR/same-boundary.json" node research/join-diagnostics-v1/same-boundary.mjs
CODI_MANIFOLD_EVIDENCE_DIR="$CODI_MANIFOLD_BUILD_DIR" node research/join-diagnostics-v1/check.mjs
```

Use a fresh output directory to keep each run's receipts. The build is disconnected
from dependency downloads and writes the artifact hashes to the output directory.
The public history maps the original upstream base to its source-only commit.

Preserved harness failures: first probe required nonnegative epsilon on empty (native sentinel -1); first C++ probe used ambiguous vec3(0) instead of vec3(0.0). Neither changed native product behavior or loosened nonempty geometry checks. Exact failed source/log/receipt retained in evidence/before/.

No filesystem race/security, account, Files, relay, service, deployment or browser tests in this lane.
