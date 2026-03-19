import { describe, expect, it } from "vitest";

import {
  createFluidSimulationPlan,
  fluidSimulationStageOrder,
  getFluidWorkerManifest,
} from "../src/index.js";

describe("getFluidWorkerManifest", () => {
  it("emits a multi-root DAG manifest with join points", () => {
    const manifest = getFluidWorkerManifest("interactive");

    const roots = manifest.jobs.filter(
      (job) => job.worker.dependencies.length === 0
    );
    const foamHistory = manifest.jobs.find((job) => job.key === "foam-history");
    const nearSurface = manifest.jobs.find((job) => job.key === "near-surface");

    expect(manifest.schedulerMode).toBe("dag");
    expect(roots.map((job) => job.key).sort()).toEqual([
      "snapshot-ingest",
      "spectrum-advance",
    ]);
    expect(foamHistory?.worker.dependencies).toEqual([
      "near-surface",
      "mid-surface",
    ]);
    expect(nearSurface?.performance.representationBand).toBe("near");
    expect(nearSurface?.performance.qualityDimensions?.rayTracing).toBe(1);
  });

  it("preserves authoritative coupling work ahead of distant proxies", () => {
    const manifest = getFluidWorkerManifest("interactive");

    const boundaryCoupling = manifest.jobs.find(
      (job) => job.key === "boundary-coupling"
    );
    const farProxy = manifest.jobs.find((job) => job.key === "far-proxy");

    expect(boundaryCoupling?.performance.authority).toBe("authoritative");
    expect(boundaryCoupling?.worker.priority).toBeGreaterThan(
      farProxy?.worker.priority ?? 0
    );
  });
});

describe("createFluidSimulationPlan", () => {
  it("requires a stable physics snapshot and exports stable render state", () => {
    const plan = createFluidSimulationPlan("interactive");

    expect(plan.snapshotSource.packageName).toBe("@plasius/gpu-physics");
    expect(plan.snapshotSource.contract).toBe("physics.worldSnapshot");
    expect(plan.continuityContract.requiresSharedWaveField).toBe(true);
    expect(plan.stages.map((stage) => stage.id)).toEqual(
      fluidSimulationStageOrder
    );
    expect(plan.stages.at(-1)?.id).toBe("render-snapshot");
    expect(plan.stages.at(-1)?.snapshotStable).toBe(true);
  });
});
