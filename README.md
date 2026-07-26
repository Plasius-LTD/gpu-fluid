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
- continuity retention as the representation band shifts by distance

## What It Solves

- Provides chunked voxel-volume fluid state for near-field water, lava, and
  sludge simulation.
- Provides deterministic V1 solver helpers for advection, pressure projection,
  solid boundary coupling, sources/sinks, foam masks, and free-surface
  extraction.
- Ships WGSL kernels for the V1 GPU stage path: `volume_advection`,
  `pressure_projection`, `boundary_coupling`, `free_surface_extraction`,
  `surface_band_update`, and `foam_spray_mask`.
- Defines near, mid, far, and horizon fluid representation bands.
- Preserves wave and foam continuity so distant fluid does not visibly pop when
  band selection changes.
- Separates stable physics snapshot inputs from derived visual fluid state.
- Emits worker-manifest DAGs compatible with `@plasius/gpu-worker`.
- Emits performance metadata compatible with `@plasius/gpu-performance`.
- Keeps representation bands as render outputs derived from simulation state,
  rather than the source of truth for fluid behavior.

## Usage

```ts
import {
  createFluidBoundaryField,
  createFluidSimulationChunkKey,
  createFluidSimulationRenderSnapshot,
  createFluidVoxelVolume,
  createFluidWavefrontSceneSourceAdapter,
  createFluidRepresentationPlan,
  createFluidSimulationPlan,
  getFluidWorkerManifest,
  selectFluidRepresentationBand,
  stepFluidSimulation,
} from "@plasius/gpu-fluid";

const chunkKey = createFluidSimulationChunkKey("harbour-ocean", 0, 0, 0);
const boundary = createFluidBoundaryField({
  chunkKey,
  sizeX: 32,
  sizeY: 16,
  sizeZ: 32,
  solid: (_x, y) => y === 0,
});
const volume = createFluidVoxelVolume({
  chunkKey,
  sizeX: 32,
  sizeY: 16,
  sizeZ: 32,
  material: "water",
  initialVolumeFraction: (_x, y) => (y < 4 ? 0.8 : 0),
});
const stepped = stepFluidSimulation(volume, { boundary, dt: 1 / 30 });
const renderSnapshot = createFluidSimulationRenderSnapshot(
  stepped.volume,
  stepped.step
);

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

console.log(activeBand, activeRepresentation?.material.ior);

const simulationPlan = createFluidSimulationPlan("interactive");
const workerManifest = getFluidWorkerManifest("interactive");

const adapter = createFluidWavefrontSceneSourceAdapter({
  fluidBodyId: "harbour-ocean",
  representation: activeRepresentation!,
  mesh: {
    positions: [-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1],
    indices: [0, 1, 2, 0, 2, 3],
  },
});

console.log(
  simulationPlan.snapshotSource.stage,
  workerManifest.jobs.length,
  adapter.mesh.materialId,
  renderSnapshot.freeSurface.indices.length
);
```

## Voxel Fluid Solver

The V1 solver is chunk-oriented and designed for terrain-coupled gameplay:

- `FluidVoxelVolume` owns volume fraction, pressure, velocity, temperature, and
  foam buffers for one material in one simulation chunk.
- `FluidBoundaryField` marks solid voxel terrain and collider cells that block
  flow.
- `FluidSourceSink` events add or drain volume for mining, waterfalls,
  sinkholes, lava vents, and gameplay tools.
- `stepFluidSimulation(...)` provides the deterministic CPU/reference step used
  by tests and non-WebGPU fallbacks.
- `src/fluid-solver.wgsl` provides the matching GPU stage entry points for
  worker integration and renderer pipelines.

The package prioritizes water and lava. Sludge shares the same solver with
different material and viscosity defaults.

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

## Worker and Performance Integration

The package emits multi-root DAG manifests rather than flat FIFO job lists.

Typical roots:

- `snapshot-ingest`
- `spectrum-advance`

Typical downstream joins:

- `volume-advection` depends on the stable snapshot
- `pressure-projection` depends on volume advection
- `boundary-coupling` consumes projected volume and solid constraints
- `free-surface-extraction` emits renderable fluid surfaces
- `surface-band-update` joins the extracted surface with the shared spectrum
- `foam-spray-mask` joins extracted surfaces and band updates
- `near-surface`, `mid-surface`, `far-proxy`, and `horizon-shell` consume the
  simulation-derived surface state

Each job carries:

- worker queue metadata for `@plasius/gpu-worker`
- performance levels and ray-tracing-first metadata for
  `@plasius/gpu-performance`
- debug metadata suitable for future `@plasius/gpu-debug` adoption

## Wavefront Material Contract

Each representation now also carries deterministic water-material and
water-medium defaults so fluid surfaces can describe more than motion:

- `material.ior`, `material.transmission`, `material.roughness`
- `material.foam`, `material.foamAmount`, and `material.caustics`
- `medium.absorption`, `medium.scattering`, and attenuation settings

`createFluidWavefrontSceneSourceAdapter(...)` bundles those descriptors with
positions, normals, tangents or tangent-generation hints, UV or derivable-UV
metadata, indices, representation band, and RT participation so the renderer
can ingest a fluid surface as a stable scene-source payload.

## Package Scope

`@plasius/gpu-fluid` currently provides:

- chunked voxel-volume fluid state
- deterministic V1 CPU/reference fluid stepping
- V1 WGSL solver kernels and exported shader asset
- free-surface extraction and render-snapshot helpers
- fluid representation-band planning
- continuity envelope generation
- stable snapshot and scene-preparation planning
- worker-manifest and budget-contract generation

Renderer pass execution, debug transport, analytics delivery, and full
engine-side scheduling remain integration responsibilities.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

<!-- BEGIN PLASIUS RELEASE INTEGRITY -->
## Release integrity

CI keeps the administrative contributor registry outside Git and npm package
artifacts using exact, case-normalised path checks. CI runs on approved
self-hosted runners. Release preparation and npm publication use GitHub-hosted
runners with Node.js 24.18.0 LTS. CD remains disabled until the npm trusted
publisher binding is verified and the legacy token fallback is removed.
<!-- END PLASIUS RELEASE INTEGRITY -->
