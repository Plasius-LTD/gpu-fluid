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

## What It Solves

- Defines near, mid, far, and horizon fluid representation bands.
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
  createFluidRepresentationPlan,
  createFluidSimulationPlan,
  getFluidWorkerManifest,
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
