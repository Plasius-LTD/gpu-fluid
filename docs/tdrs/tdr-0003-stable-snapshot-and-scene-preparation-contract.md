# TDR-0003: Stable Snapshot and Scene-Preparation Contract

## Status

Accepted

## Problem

Fluid visuals should derive from stable physics state rather than directly from
in-flight simulation mutation.

## Direction

Expose `createFluidSimulationPlan(...)` with an explicit dependency on the
`physics.worldSnapshot` contract and a stable output `render-snapshot` stage.

The plan must make the simulation-to-visual handoff visible and testable.

## Validation

- Contract tests assert `@plasius/gpu-physics` is the snapshot source.
- Contract tests assert `render-snapshot` is the final stable stage.
- Design docs explain how the stable snapshot separates authoritative truth from
  visual derivation.
