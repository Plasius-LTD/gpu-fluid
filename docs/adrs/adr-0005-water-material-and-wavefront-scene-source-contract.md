# ADR 0005: Water Material And Wavefront Scene-Source Contract

## Status

Accepted

## Context

`@plasius/gpu-fluid` already described continuity, representation bands, and
worker planning, but it did not publish a deterministic renderer-facing
material contract for water surfaces.

That prevented fluid outputs from explicitly carrying water IOR, absorption,
transmission, foam, caustic intent, and medium metadata into the wavefront
renderer integration path.

This package work inherits the parent site rollout control
`gpu-demo.scene-fidelity.enabled`, which remains the remotely controlled source
of truth for live exposure and rollback in `plasius-ltd-site`.

## Decision

`@plasius/gpu-fluid` will publish:

- deterministic water material descriptors on every representation band;
- deterministic medium descriptors on every representation band;
- a wavefront scene-source adapter payload that carries fluid geometry plus the
  material, medium, representation-band, RT-participation, and update-class
  metadata needed by the renderer boundary.

## Consequences

- fluid packages can now describe water as a material system instead of only as
  a moving surface;
- near, mid, far, and horizon representations keep stable water-material
  defaults as fidelity changes;
- renderer execution of those descriptors remains downstream work, but the
  contract is now stable and testable.
