# ADR-0004: Worker, Performance, and Physics Integration

## Status

Accepted

## Context

The current GPU architecture already prefers multi-root DAG worker scheduling,
stable physics snapshots, and performance governance via shared metadata.
Introducing fluid should not invent another scheduler or control loop.

## Decision

`@plasius/gpu-fluid` will:

- consume stable world snapshots conceptually from `@plasius/gpu-physics`
- emit multi-root DAG manifests compatible with `@plasius/gpu-worker`
- emit budget metadata compatible with `@plasius/gpu-performance`
- remain compatible with future `@plasius/gpu-debug` instrumentation

## Consequences

- Fluid joins the established GPU pipeline instead of fragmenting it.
- The first package slice is immediately composable with existing orchestration.
- Future runtime implementation can reuse the same integration seams.
