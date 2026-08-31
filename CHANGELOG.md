# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to SemVer.

## [Unreleased]

- **Added**
  - (placeholder)

- **Changed**
  - Bound npm publication to the exact prepared `main` commit after successful push-triggered CI.
  - Updated the runtime `@plasius/gpu-shared` baseline to `^1.1.1` and refreshed transitive dependency resolutions.
  - Enabled exact-head manual CI dispatch for reviewed release validation.

- **Fixed**
  - Disabled package-manager caching on self-hosted CI to prevent cache-save
    cleanup stalls from blocking the validation queue.
  - (placeholder)

- **Security**
  - Removed the npm write-token path, added a fail-closed npm 11.5.1-or-newer OIDC guard, and denied fork PR code access to self-hosted CI.
  - Pinned patched transitive npm dependencies to clear the current audit baseline.
  - Added fail-closed source and npm-package admission for the administrative contributor registry and pinned the CI/CD runtime to Node.js 24.18.0 LTS.
  - (placeholder)

## [0.1.12] - 2026-07-03

- **Added**
  - Added chunked voxel fluid simulation contracts and deterministic V1 solver
    helpers for volume advection, pressure projection, solid boundary coupling,
    sources/sinks, free-surface extraction, foam masks, and render snapshots.
  - Added exported V1 WGSL solver kernels for `volume_advection`,
    `pressure_projection`, `boundary_coupling`, `free_surface_extraction`,
    `surface_band_update`, and `foam_spray_mask`.
  - Added `FluidVoxelVolume`, `FluidBoundaryField`, `FluidSourceSink`,
    `FluidSimulationStep`, `FluidFreeSurfaceMesh`, and fluid render material
    descriptor helpers for water, lava, and sludge.
  - (placeholder)

- **Changed**
  - Updated worker simulation plans and manifests so representation bands
    consume simulation-derived free surfaces instead of acting as the fluid
    authority.
  - Extended fluid surface materials with lava, sludge, foam, steam/spray,
    emissive, and absorption shading fields.
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.11] - 2026-07-01

- **Added**
  - (placeholder)

- **Changed**
  - Updated the runtime `@plasius/gpu-shared` dependency baseline to
    `^1.0.2`.
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.10] - 2026-06-29

- **Added**
  - (placeholder)

- **Changed**
  - Refreshed runtime and toolchain dependencies to current stable releases, including `@plasius/gpu-shared` `^1.0.1`, the `@typescript-eslint` pair `^8.62.0`, Vitest `^4.1.9`, ESLint `^10.6.0`, `@types/node` `^26.0.1`, and a patched `esbuild` override on `^0.28.1`.
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.9] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.8] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.7] - 2026-06-16

- **Added**
  - Added deterministic water material and medium descriptors to fluid
    representation plans so renderer integrations can carry IOR, absorption,
    transmission, foam, and caustic intent per band.
  - Added `createFluidWavefrontSceneSourceAdapter(...)` so fluid geometry can
    emit wavefront-compatible mesh, material, medium, and representation-band
    metadata.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.4] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.3] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.2] - 2026-04-02

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.1] - 2026-03-23

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.0] - 2026-03-21

### Added

- A browser-based 3D harbor demo focused on fluid continuity.

### Changed

- `gpu-fluid/demo/` is now self-contained, with a local harbor runtime, GLTF
  ship asset, and loader instead of a sibling-repo showcase import.
- `npm run demo` still serves the browser demo, while `npm run demo:example`
  keeps the original console example path.
- The harbor runtime now renders stronger near-field shadow projection and
  reflection accents so fluid continuity remains visible under the upgraded
  lighting model.
- The fluid demo now advects a shared wave field through the harbor instead of
  using standing-wave ping-pong motion, and moving or colliding ships now
  imprint wakes and ripple impulses into the surface.
- The harbor water surface now derives smoothed heightfield normals and uses a
  denser surface grid so wave shading reads as water instead of sharp saw-tooth
  faceting.
- The harbor water now mirrors the ships, harbor blocks, and flag back into
  the surface with wave-distorted reflections instead of relying on highlights
  alone.
- The harbor ships now float from mesh-derived buoyancy offsets, and the scene
  render order now keeps water beneath the solid hull pass so the demo no
  longer shows water-over-hull z-fighting.

## [0.1.0] - 2026-03-19

### Added

- Initial `@plasius/gpu-fluid` package scaffold.
- Fluid representation-band planning for near, mid, far, and horizon ranges.
- Continuity envelope contracts for shared wave identity across range changes.
- Stable snapshot and worker-manifest planning compatible with
  `@plasius/gpu-worker` and `@plasius/gpu-performance`.
- ADRs, TDRs, design documentation, demo example, and contract/unit tests.

[0.1.0]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.0
[0.1.1]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.1
[0.1.2]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.2
[0.1.3]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.3
[0.1.4]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.4
[0.1.7]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.7
[0.1.8]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.8
[0.1.9]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.9
[0.1.10]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.10
[0.1.11]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.11
[0.1.12]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.12
