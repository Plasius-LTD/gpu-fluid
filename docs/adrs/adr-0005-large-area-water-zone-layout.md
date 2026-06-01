# ADR-0005: Large-Area Water Zone Layout

## Status

Accepted

## Context

Fluid renderers need to cover near, mid, far, and horizon water without pushing
one high-density mesh across the whole scene. Leaving each consumer to build
those ranges independently creates overlapping water sheets, mismatched seams,
and inconsistent handling of fixed shoreline structures.

## Decision

`@plasius/gpu-fluid` owns a large-area water-zone layout contract. Consumers
provide explicit zones, continuity inputs, vessel/impulse state, and optional
exclusion polygons. The package sorts zones by depth, rejects overlaps and
unstitched gaps, normalizes shared boundary widths, samples the shared
wave/wake/impulse field for vertices, computes smoothed normals, and emits
renderer-ready indices with excluded cells omitted.

Renderers still own material color, draw ordering, and scene-specific polygon
footprints. The fluid package owns the geometric continuity and sampled water
surface contract.

## Consequences

- Large fluid areas are planned once in the fluid package instead of rebuilt
  differently by each demo or renderer.
- Near/mid/far/horizon surfaces can reduce fidelity while staying stitched at
  shared boundaries.
- Scene-specific structures can cut holes in the water mesh without moving that
  harbor knowledge into the fluid simulation package.
- Future GPU kernels can target the same zone layout contract instead of a
  renderer-local mesh convention.
