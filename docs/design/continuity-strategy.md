# Continuity Strategy

## Problem

Fluid motion is legible at long range. If distant fluid loses its shared motion
identity, range transitions look like popping rather than graceful LOD.

## Strategy

Every plan uses one continuity envelope:

- `continuityGroupId` groups all band outputs
- `waveFieldId` keeps the wave source stable
- amplitude floors ensure distant bands still express large-form motion
- frequency floors ensure low-frequency waves persist
- blend windows define the handoff span between adjacent bands

## Practical Outcome

The package allows fidelity to fall with distance without making the fluid feel
like it has become a different body of water.

## Follow-On Work

Future runtime slices can map this contract onto:

- spectrum simulation
- heightfield caches
- foam history buffers
- far-field render caches
