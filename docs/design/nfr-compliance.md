# NFR Compliance

## Scope

This package currently provides planning and contract APIs, not GPU kernels or
frame rendering.

## Reliability

- Inputs are validated before plans are emitted.
- Invalid threshold ordering is rejected.
- Invalid continuity ratios are rejected.

## Performance

- APIs emit immutable, reusable plan objects.
- Worker manifests are modeled for DAG scheduling instead of flat queuing.
- Banded planning makes cost control explicit from the start.

## Maintainability

- Public contracts are typed.
- ADRs and TDRs define scope and technical direction.
- Contract and unit tests cover representation, continuity, and worker
  integration behavior.

## Security and Privacy

- No analytics transport or secret handling is added here.
- No real user data is required for the public contracts.
