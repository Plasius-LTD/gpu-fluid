# TDR-0001: Fluid Representation Plan Contract

## Status

Accepted

## Problem

Consumers need a deterministic way to request fluid planning for a body of
water and to inspect how that body is represented across distance bands.

## Direction

Expose `createFluidRepresentationPlan(...)` and
`selectFluidRepresentationBand(...)` as the primary public contract.

The plan must include:

- fluid body id and kind
- selected profile
- near/mid/far/horizon thresholds
- a normalized continuity envelope
- one representation descriptor per band
- performance hints for each representation

## Validation

- Contract tests assert four band descriptors are always produced.
- Unit tests assert threshold ordering and band selection behavior.
- Contract tests assert shared continuity ids and retained amplitude/frequency
  floors across bands.
