# ADR-0001: Package Scope

## Status

Accepted

## Context

Plasius needs a fluid offering that sits alongside `gpu-physics`,
`gpu-renderer`, `gpu-worker`, and `gpu-performance` without overloading any
existing package. Fluid work has both simulation-facing and rendering-facing
concerns, and it must preserve continuity across distance bands rather than
acting as a near-field-only effect.

## Decision

Create `@plasius/gpu-fluid` as a first-class specialist package responsible for:

- continuity-aware fluid representation planning
- stable physics snapshot handoff into derived fluid state
- worker DAG manifests for fluid scene preparation
- performance metadata aligned with `@plasius/gpu-performance`

The package does not initially own a production solver or renderer passes. The
first slice focuses on contracts and planning APIs.

## Consequences

- Fluid-specific architecture can evolve without distorting `gpu-physics`.
- Other packages can consume stable contracts immediately.
- Runtime solver and render kernels remain follow-on work.
