# ADR-0003: Shared Wave Continuity

## Status

Accepted

## Context

The user requirement is explicit: waves must not suddenly disappear when the
viewer moves between near and far ranges. That means distant fluid cannot be a
wholly separate visual answer with unrelated motion.

## Decision

All representation bands must derive from a shared continuity envelope:

- a shared continuity group id
- a shared wave-field id
- per-band amplitude and frequency floors
- blend windows for range transitions
- retained low-frequency motion and directionality across all bands

The visual answer is allowed to lose fidelity with distance, but it must retain
shared large-form motion.

## Consequences

- Range transitions are treated as part of the architecture, not as incidental
  LOD implementation detail.
- The package can provide a clear contract for avoiding fluid popping.
- Future solver or renderer work can plug into a stable continuity model.
