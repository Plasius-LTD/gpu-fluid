# Contributing to @plasius/gpu-fluid

This document explains how to work on the package, how to propose changes, and
what we expect in pull requests.

## Code of Conduct

Participation in this project is governed by `CODE_OF_CONDUCT.md`.

## Licensing and CLA

This project is open source under `LICENSE`. Contributors must complete the
appropriate CLA in [`legal/`](./legal) before large contributions can be
merged.

## Security

Do not report vulnerabilities in public issues or pull requests. Follow
`SECURITY.md`.

## What This Project Does

`@plasius/gpu-fluid` provides fluid-planning and integration contracts for the
Plasius GPU stack:

- continuity-aware near, mid, far, and horizon fluid representations
- stable physics snapshot handoff for derived fluid state
- worker DAG manifests for scene preparation
- performance metadata that can be consumed by `@plasius/gpu-performance`

The package currently focuses on architecture contracts and runtime planning
helpers, not on shipping a full production solver.

## Local Development

### Prerequisites

- Node.js 24 (`nvm use`)
- npm

### Install

```bash
npm ci
```

### Validate

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:check
```

## How to Propose a Change

- Open an issue first for non-trivial feature work.
- Add or update ADRs and TDRs when architecture or public contracts change.
- Add contract or unit tests before implementing new behavior.

## Pull Request Expectations

- Use Conventional Commits.
- Keep changes focused.
- Update `README.md`, `CHANGELOG.md`, and architecture docs when behavior or
  structure changes.
- Keep CI green.

## Coding Standards

- TypeScript with strict types.
- Vitest for runtime and contract tests.
- ESLint must pass without warnings.
- Public exports should include concise TSDoc.
- Representation continuity and physics/visual separation are architectural
  requirements, not optional optimizations.
