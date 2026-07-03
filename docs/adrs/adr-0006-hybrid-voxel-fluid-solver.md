# ADR-0006: Hybrid Voxel Fluid Solver

## Status

Accepted

## Context

`@plasius/gpu-fluid` previously focused on representation bands, material
contracts, and worker planning. Destructible voxel worlds need fluid behavior
that reacts to solid terrain boundaries, mining, sinkholes, volcanic edits, and
chunk adjacency. Surface-only continuity descriptors cannot model water draining
through a mined shaft, lava filling a cave, or fluid stopping at a voxel
collider.

## Decision

`@plasius/gpu-fluid` now owns a V1 chunked voxel-volume simulation contract and
reference implementation. Near-field water, lava, and sludge use
`FluidVoxelVolume` state with volume fraction, pressure, velocity, temperature,
and foam buffers. Terrain and collision constraints enter through
`FluidBoundaryField`. Runtime tools express inflow/outflow through
`FluidSourceSink`.

The worker DAG includes volume advection, pressure projection, boundary
coupling, free-surface extraction, surface-band update, foam/spray mask, and
render snapshot stages. Representation bands remain in the package, but they
consume simulation-derived surfaces instead of acting as the fluid authority.

The package ships deterministic CPU/reference helpers and WGSL kernels with the
same stage names. Engine integrations can schedule the WGSL path while tests and
fallbacks use the reference solver.

## Consequences

- Fluid simulation state can be generated and tested independently of a
  renderer.
- World-generation packages can separate solid terrain meshes from simulated
  fluid surfaces and avoid painting terrain triangles as water or lava.
- Worker manifests now describe authoritative simulation stages before visual
  representation stages.
- Full renderer pass execution and engine scheduling remain integration work,
  but the package exposes the buffers, stages, and deterministic behavior those
  integrations need.
