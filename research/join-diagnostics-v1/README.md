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

`build.sh`: separate R730 build, retained Emscripten5.0.2, pinned Clipper2 `46f639177fe418f9689e8ddb74f08a870c71f5b4`, fully disconnected local dependency source. No shared app cache write. `run-preservation.sh` links only a test executable against the same archive. Binaries stay outside Git.

Experimental JS remains `cd2031fd75cbbc812b550dd228f95b9fd666ae4da6557f840e3d3ed4cbed268b`: registrations live in WASM. New experimental WASM: `636b7dc8e03a31a355ce5d7ec5a2bf3bb449eb7ea1c0aba5819bfb467d46ca0f`. App WASM remains `7bb5f8ee10fcafdab78799b1e5dd2cdc7c282ea0bf8e7939c43f3ad34b823e3d`.

Set CODI_MANIFOLD_GLUE to a byte-identical .mjs copy of emitted glue, CODI_MANIFOLD_WASM to emitted WASM, CODI_NATIVE_PINS to evidence/pins.json, CODI_OBSERVATION to a new path; run probe.mjs or same-boundary.mjs with Node. `node check.mjs` checks committed arithmetic/observations offline. Full source/archive/runtime hashes: evidence/pins.json and receipt.json.

Preserved harness failures: first probe required nonnegative epsilon on empty (native sentinel -1); first C++ probe used ambiguous vec3(0) instead of vec3(0.0). Neither changed native product behavior or loosened nonempty geometry checks. Exact failed source/log/receipt retained in evidence/before/.

No filesystem race/security, account, Files, relay, service, deployment or browser tests in this lane.
