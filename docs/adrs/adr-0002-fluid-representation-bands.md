# ADR-0002: Fluid Representation Bands

## Status

Accepted

## Context

Fluid is especially sensitive to visible popping because motion cues carry over
large distances. A flat single-representation approach either overspends on
distant water or produces obvious quality cliffs.

## Decision

Use explicit `near`, `mid`, `far`, and `horizon` representation bands:

- `near`: full live surface and highest fidelity
- `mid`: simplified live surface with shared motion identity
- `far`: merged proxy or tiled proxy surface
- `horizon`: extremely cheap horizon shell or distant representation

Band selection is distance-based, but each band is planned together so the
system can preserve continuity between them.

## Consequences

- The package can scale quality without pretending every meter of fluid needs
  the same representation.
- Fluid planning aligns with the existing range-banded GPU architecture.
- Consumer packages can reason about fluid like any other banded visual system.
