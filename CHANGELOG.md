# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to SemVer.

## [Unreleased]

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

## [0.1.0] - 2026-03-19

### Added

- Initial `@plasius/gpu-fluid` package scaffold.
- Fluid representation-band planning for near, mid, far, and horizon ranges.
- Continuity envelope contracts for shared wave identity across range changes.
- Stable snapshot and worker-manifest planning compatible with
  `@plasius/gpu-worker` and `@plasius/gpu-performance`.
- ADRs, TDRs, design documentation, demo example, and contract/unit tests.

[0.1.0]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.0
