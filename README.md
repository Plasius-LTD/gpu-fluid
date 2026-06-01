# @plasius/gpu-fluid

[![npm version](https://img.shields.io/npm/v/@plasius/gpu-fluid.svg)](https://www.npmjs.com/package/@plasius/gpu-fluid)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/gpu-fluid/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/gpu-fluid/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/gpu-fluid)](https://codecov.io/gh/Plasius-LTD/gpu-fluid)
[![License](https://img.shields.io/github/license/Plasius-LTD/gpu-fluid)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Continuity-aware fluid simulation and rendering contracts for Plasius WebGPU
stacks.

Apache-2.0. ESM + CJS builds. TypeScript types included.

## Install

```bash
npm install @plasius/gpu-fluid
```

## Browser Demo

```bash
npm run demo
```

Then open `http://localhost:8000/gpu-fluid/demo/`.

`npm run demo` now serves a browser-based 3D harbor validation scene focused on
fluid continuity. The existing console example remains available via
`npm run demo:example`.

The demo now validates:

- directional wave continuity rather than in-place standing oscillation
- ship wakes and hull pressure on the near-field surface
- collision ripple propagation when rigid bodies interact
- shared water-surface sampling and renderer-ready wake/foam descriptors
- smoothed finite-difference water normals and effect-specific water particles
- continuity retention as the representation band shifts by distance
- stitched large-area zone layout so near, mid, far, and horizon surfaces share
  boundaries instead of overlapping or leaving gaps

## What It Solves

- Defines near, mid, far, and horizon fluid representation bands.
- Builds stitched large-area water-surface zones with shared z boundaries,
  seam-width normalization, and polygonal exclusion masks for fixed shoreline
  structures.
- Preserves wave and foam continuity so distant fluid does not visibly pop when
  band selection changes.
- Separates stable physics snapshot inputs from derived visual fluid state.
- Emits worker-manifest DAGs compatible with `@plasius/gpu-worker`.
- Emits performance metadata compatible with `@plasius/gpu-performance`.
- Keeps the first package slice focused on contracts, planning, and integration
  surfaces rather than pretending to ship a full solver on day one.

## Usage

```ts
import {
  buildFluidWaterSurfaceZoneLayout,
  buildFluidWaterMotionEffects,
  createFluidRepresentationPlan,
  createFluidWaterSurfaceSettings,
  createFluidSimulationPlan,
  getFluidWorkerManifest,
  sampleFluidWaterSurface,
  sampleFluidWaterSurfaceNormal,
  selectFluidRepresentationBand,
} from "@plasius/gpu-fluid";

const representationPlan = createFluidRepresentationPlan({
  fluidBodyId: "harbour-ocean",
  kind: "ocean",
  profile: "interactive",
  supportsRayTracing: true,
  nearFieldMaxMeters: 45,
  midFieldMaxMeters: 160,
  farFieldMaxMeters: 700,
});

const activeBand = selectFluidRepresentationBand(72, representationPlan.thresholds);
const activeRepresentation = representationPlan.representations.find(
  (entry) => entry.band === activeBand
);

console.log(activeBand, activeRepresentation?.continuity);

const simulationPlan = createFluidSimulationPlan("interactive");
const workerManifest = getFluidWorkerManifest("interactive");

console.log(simulationPlan.snapshotSource.stage, workerManifest.jobs.length);

const waterSettings = createFluidWaterSurfaceSettings({
  waveDirection: { x: 0.88, z: 0.28 },
  wakeStrength: 0.31,
});
const waterSample = sampleFluidWaterSurface({
  x: -4,
  z: 7,
  time: 1.4,
  settings: waterSettings,
  vessels: [
    {
      id: "northwind",
      position: { x: 0, y: 0, z: 6 },
      velocity: { x: 2.3, y: 0, z: -1 },
    },
  ],
});
const waterNormal = sampleFluidWaterSurfaceNormal({
  x: -4,
  z: 7,
  time: 1.4,
  settings: waterSettings,
  verticalScale: 0.24,
});
const wakeEffects = buildFluidWaterMotionEffects({
  time: 1.4,
  settings: waterSettings,
  vessels: [
    {
      id: "northwind",
      position: { x: 0, y: 0, z: 6 },
      velocity: { x: 2.3, y: 0, z: -1 },
    },
  ],
});

const zoneLayout = buildFluidWaterSurfaceZoneLayout({
  time: 1.4,
  settings: waterSettings,
  zones: [
    {
      id: "near-water",
      band: "near",
      minZ: -6,
      maxZ: 16,
      startWidthMeters: 72,
      endWidthMeters: 58,
      rows: 24,
      columns: 49,
      baseHeightStart: 0.18,
      baseHeightEnd: 0.1,
    },
    {
      id: "mid-water",
      band: "mid",
      minZ: 16,
      maxZ: 46,
      startWidthMeters: 58,
      endWidthMeters: 76,
      rows: 14,
      columns: 25,
      baseHeightStart: 0.1,
      baseHeightEnd: 0.02,
    },
  ],
  continuity: representationPlan.continuity.bands,
  exclusions: [
    {
      id: "quay",
      points: [
        { x: -12, z: -3 },
        { x: -12, z: 5 },
        { x: -1, z: 5 },
        { x: -1, z: -3 },
      ],
    },
  ],
});

console.log(
  waterSample.height,
  waterNormal.normal.y,
  wakeEffects.particles.length,
  zoneLayout.stitching.length
);
```

## Continuity Model

Fluid bands are expected to share a common continuity group and wave-field
identity. Each band retains a non-zero amplitude and frequency floor from the
same shared source so large-form motion continues to read consistently when the
view changes:

- `near`: full live surface, highest mesh density, highest update rate
- `mid`: simplified live surface, reduced cost, same shared wave identity
- `far`: merged or tiled proxy surface, lower update cadence, same low-frequency
  wave presence
- `horizon`: horizon shell or distant proxy with retained directional motion

The continuity model is designed so the visual answer changes in fidelity, not
in whether waves exist at all.

## Large-Area Zones

Renderers should use `buildFluidWaterSurfaceZoneLayout(...)` when they need an
open water field that spans multiple representation bands. The helper sorts the
zones by depth, rejects overlapping or gapped ranges, normalizes neighboring
seam widths in `shared-boundary` mode, samples the shared wave/wake/impulse
field for each vertex, and omits cells whose centers fall inside supplied
exclusion polygons.

This keeps large surfaces owned by the fluid package while letting renderers
provide scene-specific inputs such as harbor quays, piers, docks, or shoreline
footprints. Consumers remain responsible for material color and final draw
order; `@plasius/gpu-fluid` owns the geometric continuity and sampled surface
contract.

## Worker and Performance Integration

The package emits multi-root DAG manifests rather than flat FIFO job lists.

Typical roots:

- `snapshot-ingest`
- `spectrum-advance`

Typical downstream joins:

- `near-surface` depends on both the stable physics snapshot and the current
  wave spectrum
- `foam-history` depends on both `near-surface` and `mid-surface`

Each job carries:

- worker queue metadata for `@plasius/gpu-worker`
- performance levels and ray-tracing-first metadata for
  `@plasius/gpu-performance`
- debug metadata suitable for future `@plasius/gpu-debug` adoption

## Package Scope

`@plasius/gpu-fluid` currently provides:

- fluid representation-band planning
- continuity envelope generation
- stable snapshot and scene-preparation planning
- worker-manifest and budget-contract generation
- shared directional wave, vessel wake, collision ripple, and wake/foam
  descriptor helpers for package demos and renderers
- smoothed water normal sampling and deterministic wake, bow-spray, impact-spray,
  and ripple-foam particle descriptors
- stitched large-area water-zone mesh generation with shared boundaries and
  exclusion-aware cell indices

It does not yet provide:

- a production fluid solver
- actual GPU kernels
- renderer pass execution
- debug transport or analytics delivery

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```
