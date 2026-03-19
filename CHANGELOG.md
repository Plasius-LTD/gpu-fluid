# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to SemVer.

## [Unreleased]

### Added

- A browser-based 3D harbor demo focused on fluid continuity.

### Changed

- `npm run demo` now serves the browser demo, while `npm run demo:example`
  keeps the original console example path.

## [0.1.0] - 2026-03-19

### Added

- Initial `@plasius/gpu-fluid` package scaffold.
- Fluid representation-band planning for near, mid, far, and horizon ranges.
- Continuity envelope contracts for shared wave identity across range changes.
- Stable snapshot and worker-manifest planning compatible with
  `@plasius/gpu-worker` and `@plasius/gpu-performance`.
- ADRs, TDRs, design documentation, demo example, and contract/unit tests.

[0.1.0]: https://github.com/Plasius-LTD/gpu-fluid/releases/tag/v0.1.0
