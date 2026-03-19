# Fluid Rendering Architecture

## Overview

`@plasius/gpu-fluid` models fluid as a continuity-aware system that spans
simulation inputs, banded scene preparation, and future renderer consumption.

The initial package slice does not render frames directly. Instead, it defines
the contracts needed to do that safely later.

## Core Model

The package treats fluid in three linked layers:

1. Stable snapshot input from `gpu-physics`
2. Shared wave continuity model
3. Distance-banded representation outputs

This keeps authoritative motion separate from visual derivation while still
letting the renderer consume fluid state that feels continuous.

## Representation Bands

- `near`: full live surface and highest fidelity
- `mid`: simplified live surface with shared wave identity
- `far`: merged proxy surface retaining low-frequency motion
- `horizon`: low-cost horizon shell with directional continuity

## Worker Scheduling

Fluid scene preparation is modeled as a multi-root DAG:

- `snapshot-ingest` and `spectrum-advance` can start independently
- `boundary-coupling` depends on the stable physics snapshot
- `surface-solve` joins the snapshot and spectrum paths
- band-specific surface preparation fans out from `surface-solve`
- `foam-history` joins near and mid outputs
- `render-snapshot` joins all visual outputs into a stable answer

## Integration Points

- `gpu-physics`: stable snapshot source
- `gpu-worker`: worker DAG execution contract
- `gpu-performance`: worker budget and representation metadata
- `gpu-renderer`: future consumer of prepared fluid representations
- `gpu-debug`: future diagnostics for phase timing and band state
