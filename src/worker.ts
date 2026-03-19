import type {
  FluidPerformanceDomain,
  FluidPerformanceImportanceSignals,
  FluidPerformanceQualityDimensions,
  FluidProfileName,
  FluidRepresentationBand,
  FluidSimulationPlan,
  FluidSimulationPlanStage,
  FluidSimulationStageId,
  FluidWorkerAuthority,
  FluidWorkerBudgetLevel,
  FluidWorkerImportance,
  FluidWorkerManifest,
  FluidWorkerManifestJob,
  FluidWorkerQueueClass,
} from "./types.js";
import { fluidProfileNames, fluidRepresentationBands } from "./types.js";
import { normalizeFluidProfile } from "./validation.js";

export const fluidDebugOwner = "fluid";
export const defaultFluidProfile = "interactive";

type BudgetPreset = {
  estimatedCostMs: number;
  maxDispatchesPerFrame: number;
  maxJobsPerDispatch: number;
  cadenceDivisor: number;
  workgroupScale: number;
  maxQueueDepth: number;
};

type WorkerLevelSpec = {
  low: BudgetPreset;
  medium: BudgetPreset;
  high: BudgetPreset;
};

type WorkerJobSpec = {
  label: string;
  queueClass: FluidWorkerQueueClass;
  priority: number;
  dependencies: readonly string[];
  domain: FluidPerformanceDomain;
  authority: FluidWorkerAuthority;
  importance: FluidWorkerImportance;
  representationBand?: FluidRepresentationBand;
  qualityDimensions?: Readonly<FluidPerformanceQualityDimensions>;
  importanceSignals?: Readonly<FluidPerformanceImportanceSignals>;
  suggestedAllocationIds: readonly string[];
  levels: WorkerLevelSpec;
};

type WorkerProfileSpec = {
  description: string;
  suggestedAllocationIds: readonly string[];
  jobs: Readonly<Record<string, WorkerJobSpec>>;
};

const simulationStageLabels: Readonly<Record<FluidSimulationStageId, string>> =
  Object.freeze({
    "snapshot-ingest": "Ingest stable physics snapshot",
    "spectrum-advance": "Advance shared wave spectrum",
    "boundary-coupling": "Resolve boundaries and buoyancy coupling",
    "surface-solve": "Solve fluid surface state",
    "near-surface": "Prepare near-field live surface",
    "mid-surface": "Prepare mid-field simplified surface",
    "far-proxy": "Prepare far-field merged proxy",
    "horizon-shell": "Prepare horizon shell",
    "foam-history": "Propagate foam and crest history",
    "render-snapshot": "Commit stable render snapshot",
  });

function createSimulationStage(
  stage: FluidSimulationPlanStage
): FluidSimulationPlanStage {
  return Object.freeze({
    ...stage,
    dependencies: Object.freeze([...stage.dependencies]),
  });
}

function buildBudgetLevels(
  jobType: string,
  queueClass: FluidWorkerQueueClass,
  levels: WorkerLevelSpec
): readonly FluidWorkerBudgetLevel[] {
  return Object.freeze(
    (["low", "medium", "high"] as const).map((quality) =>
      Object.freeze({
        id: quality,
        estimatedCostMs: levels[quality].estimatedCostMs,
        config: Object.freeze({
          maxDispatchesPerFrame: levels[quality].maxDispatchesPerFrame,
          maxJobsPerDispatch: levels[quality].maxJobsPerDispatch,
          cadenceDivisor: levels[quality].cadenceDivisor,
          workgroupScale: levels[quality].workgroupScale,
          maxQueueDepth: levels[quality].maxQueueDepth,
          metadata: Object.freeze({
            owner: "fluid",
            queueClass,
            jobType,
            quality,
          }),
        }),
      })
    )
  );
}

function buildManifestJob(
  profile: FluidProfileName,
  key: string,
  spec: WorkerJobSpec
): FluidWorkerManifestJob {
  return Object.freeze({
    key,
    label: spec.label,
    worker: Object.freeze({
      jobType: spec.label,
      queueClass: spec.queueClass,
      priority: spec.priority,
      dependencies: Object.freeze([...spec.dependencies]),
      schedulerMode: "dag",
    }),
    performance: Object.freeze({
      id: spec.label,
      jobType: spec.label,
      queueClass: spec.queueClass,
      domain: spec.domain,
      authority: spec.authority,
      importance: spec.importance,
      representationBand: spec.representationBand,
      qualityDimensions: spec.qualityDimensions,
      importanceSignals: spec.importanceSignals,
      levels: buildBudgetLevels(spec.label, spec.queueClass, spec.levels),
    }),
    debug: Object.freeze({
      owner: "fluid",
      queueClass: spec.queueClass,
      jobType: spec.label,
      tags: Object.freeze([
        "fluid",
        profile,
        key,
        spec.authority,
        spec.domain,
        ...(spec.representationBand ? [spec.representationBand] : []),
      ]),
      suggestedAllocationIds: Object.freeze([...spec.suggestedAllocationIds]),
    }),
  });
}

const interactiveWorkerProfileSpec: WorkerProfileSpec = Object.freeze({
  description:
    "Interactive fluid profile that preserves stable snapshot coupling while scaling distant surface cost before near-field continuity.",
  suggestedAllocationIds: Object.freeze([
    "fluid.snapshot",
    "fluid.spectrum",
    "fluid.surface.near",
  ]),
  jobs: Object.freeze({
    "snapshot-ingest": Object.freeze({
      label: "fluid.snapshot-ingest",
      queueClass: "simulation",
      priority: 500,
      dependencies: Object.freeze([]),
      domain: "physics",
      authority: "authoritative",
      importance: "critical",
      suggestedAllocationIds: Object.freeze(["fluid.snapshot"]),
      levels: {
        low: {
          estimatedCostMs: 0.25,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 32,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 64,
        },
        medium: {
          estimatedCostMs: 0.35,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 48,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 96,
        },
        high: {
          estimatedCostMs: 0.45,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 64,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 128,
        },
      },
    }),
    "spectrum-advance": Object.freeze({
      label: "fluid.spectrum-advance",
      queueClass: "simulation",
      priority: 470,
      dependencies: Object.freeze([]),
      domain: "physics",
      authority: "non-authoritative-simulation",
      importance: "high",
      suggestedAllocationIds: Object.freeze(["fluid.spectrum"]),
      levels: {
        low: {
          estimatedCostMs: 0.45,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 32,
          cadenceDivisor: 2,
          workgroupScale: 0.6,
          maxQueueDepth: 96,
        },
        medium: {
          estimatedCostMs: 0.8,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 48,
          cadenceDivisor: 1,
          workgroupScale: 0.8,
          maxQueueDepth: 128,
        },
        high: {
          estimatedCostMs: 1.2,
          maxDispatchesPerFrame: 2,
          maxJobsPerDispatch: 64,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 192,
        },
      },
    }),
    "boundary-coupling": Object.freeze({
      label: "fluid.boundary-coupling",
      queueClass: "simulation",
      priority: 450,
      dependencies: Object.freeze(["snapshot-ingest"]),
      domain: "physics",
      authority: "authoritative",
      importance: "critical",
      suggestedAllocationIds: Object.freeze(["fluid.boundary"]),
      levels: {
        low: {
          estimatedCostMs: 0.55,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 32,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 96,
        },
        medium: {
          estimatedCostMs: 0.85,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 48,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 128,
        },
        high: {
          estimatedCostMs: 1.2,
          maxDispatchesPerFrame: 2,
          maxJobsPerDispatch: 64,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 192,
        },
      },
    }),
    "surface-solve": Object.freeze({
      label: "fluid.surface-solve",
      queueClass: "simulation",
      priority: 430,
      dependencies: Object.freeze(["boundary-coupling", "spectrum-advance"]),
      domain: "physics",
      authority: "non-authoritative-simulation",
      importance: "high",
      suggestedAllocationIds: Object.freeze(["fluid.surface.solve"]),
      levels: {
        low: {
          estimatedCostMs: 0.9,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 24,
          cadenceDivisor: 2,
          workgroupScale: 0.65,
          maxQueueDepth: 96,
        },
        medium: {
          estimatedCostMs: 1.5,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 32,
          cadenceDivisor: 1,
          workgroupScale: 0.82,
          maxQueueDepth: 128,
        },
        high: {
          estimatedCostMs: 2.1,
          maxDispatchesPerFrame: 2,
          maxJobsPerDispatch: 48,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 192,
        },
      },
    }),
    "near-surface": Object.freeze({
      label: "fluid.near-surface",
      queueClass: "render",
      priority: 420,
      dependencies: Object.freeze(["surface-solve"]),
      domain: "geometry",
      authority: "visual",
      importance: "critical",
      representationBand: "near",
      qualityDimensions: Object.freeze({
        geometry: 1,
        shading: 1,
        rayTracing: 1,
        updateCadence: 1,
        temporalReuse: 0.2,
      }),
      importanceSignals: Object.freeze({
        visible: true,
        playerRelevant: true,
        imageCritical: true,
        motionClass: "dynamic",
        shadowSignificance: "high",
      }),
      suggestedAllocationIds: Object.freeze(["fluid.surface.near"]),
      levels: {
        low: {
          estimatedCostMs: 1.1,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 16,
          cadenceDivisor: 2,
          workgroupScale: 0.6,
          maxQueueDepth: 64,
        },
        medium: {
          estimatedCostMs: 1.8,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 24,
          cadenceDivisor: 1,
          workgroupScale: 0.82,
          maxQueueDepth: 96,
        },
        high: {
          estimatedCostMs: 2.8,
          maxDispatchesPerFrame: 2,
          maxJobsPerDispatch: 32,
          cadenceDivisor: 1,
          workgroupScale: 1,
          maxQueueDepth: 128,
        },
      },
    }),
    "mid-surface": Object.freeze({
      label: "fluid.mid-surface",
      queueClass: "render",
      priority: 330,
      dependencies: Object.freeze(["surface-solve"]),
      domain: "geometry",
      authority: "visual",
      importance: "high",
      representationBand: "mid",
      qualityDimensions: Object.freeze({
        geometry: 0.72,
        shading: 0.72,
        rayTracing: 0.58,
        updateCadence: 0.72,
        temporalReuse: 0.5,
      }),
      importanceSignals: Object.freeze({
        visible: true,
        playerRelevant: true,
        imageCritical: false,
        motionClass: "dynamic",
        shadowSignificance: "medium",
      }),
      suggestedAllocationIds: Object.freeze(["fluid.surface.mid"]),
      levels: {
        low: {
          estimatedCostMs: 0.7,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 16,
          cadenceDivisor: 2,
          workgroupScale: 0.55,
          maxQueueDepth: 64,
        },
        medium: {
          estimatedCostMs: 1.1,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 24,
          cadenceDivisor: 1,
          workgroupScale: 0.75,
          maxQueueDepth: 96,
        },
        high: {
          estimatedCostMs: 1.6,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 32,
          cadenceDivisor: 1,
          workgroupScale: 0.9,
          maxQueueDepth: 128,
        },
      },
    }),
    "far-proxy": Object.freeze({
      label: "fluid.far-proxy",
      queueClass: "render",
      priority: 220,
      dependencies: Object.freeze(["spectrum-advance"]),
      domain: "geometry",
      authority: "visual",
      importance: "medium",
      representationBand: "far",
      qualityDimensions: Object.freeze({
        geometry: 0.32,
        shading: 0.38,
        rayTracing: 0.2,
        updateCadence: 0.25,
        temporalReuse: 0.9,
      }),
      importanceSignals: Object.freeze({
        visible: true,
        playerRelevant: false,
        imageCritical: false,
        motionClass: "stable",
        shadowSignificance: "medium",
      }),
      suggestedAllocationIds: Object.freeze(["fluid.surface.far"]),
      levels: {
        low: {
          estimatedCostMs: 0.25,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 12,
          cadenceDivisor: 6,
          workgroupScale: 0.4,
          maxQueueDepth: 48,
        },
        medium: {
          estimatedCostMs: 0.45,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 16,
          cadenceDivisor: 4,
          workgroupScale: 0.55,
          maxQueueDepth: 64,
        },
        high: {
          estimatedCostMs: 0.7,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 20,
          cadenceDivisor: 3,
          workgroupScale: 0.7,
          maxQueueDepth: 96,
        },
      },
    }),
    "horizon-shell": Object.freeze({
      label: "fluid.horizon-shell",
      queueClass: "render",
      priority: 120,
      dependencies: Object.freeze(["spectrum-advance"]),
      domain: "geometry",
      authority: "visual",
      importance: "low",
      representationBand: "horizon",
      qualityDimensions: Object.freeze({
        geometry: 0.12,
        shading: 0.14,
        rayTracing: 0,
        updateCadence: 0.1,
        temporalReuse: 1,
      }),
      importanceSignals: Object.freeze({
        visible: true,
        playerRelevant: false,
        imageCritical: false,
        motionClass: "stable",
        shadowSignificance: "low",
      }),
      suggestedAllocationIds: Object.freeze(["fluid.surface.horizon"]),
      levels: {
        low: {
          estimatedCostMs: 0.1,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 8,
          cadenceDivisor: 10,
          workgroupScale: 0.25,
          maxQueueDepth: 32,
        },
        medium: {
          estimatedCostMs: 0.18,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 8,
          cadenceDivisor: 8,
          workgroupScale: 0.35,
          maxQueueDepth: 32,
        },
        high: {
          estimatedCostMs: 0.28,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 12,
          cadenceDivisor: 6,
          workgroupScale: 0.45,
          maxQueueDepth: 48,
        },
      },
    }),
    "foam-history": Object.freeze({
      label: "fluid.foam-history",
      queueClass: "render",
      priority: 310,
      dependencies: Object.freeze(["near-surface", "mid-surface"]),
      domain: "custom",
      authority: "visual",
      importance: "high",
      representationBand: "mid",
      qualityDimensions: Object.freeze({
        shading: 0.6,
        updateCadence: 0.6,
        temporalReuse: 0.85,
      }),
      importanceSignals: Object.freeze({
        visible: true,
        playerRelevant: true,
        imageCritical: false,
        motionClass: "dynamic",
        shadowSignificance: "low",
      }),
      suggestedAllocationIds: Object.freeze(["fluid.foam"]),
      levels: {
        low: {
          estimatedCostMs: 0.2,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 12,
          cadenceDivisor: 3,
          workgroupScale: 0.5,
          maxQueueDepth: 48,
        },
        medium: {
          estimatedCostMs: 0.35,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 16,
          cadenceDivisor: 2,
          workgroupScale: 0.7,
          maxQueueDepth: 64,
        },
        high: {
          estimatedCostMs: 0.55,
          maxDispatchesPerFrame: 1,
          maxJobsPerDispatch: 20,
          cadenceDivisor: 1,
          workgroupScale: 0.85,
          maxQueueDepth: 96,
        },
      },
    }),
  }),
});

const cinematicWorkerProfileSpec: WorkerProfileSpec = Object.freeze({
  description:
    "Cinematic fluid profile that spends more budget on near and mid-field continuity before degrading distant fluid work.",
  suggestedAllocationIds: Object.freeze([
    "fluid.snapshot",
    "fluid.surface.near",
    "fluid.surface.mid",
  ]),
  jobs: Object.freeze(
    Object.fromEntries(
      Object.entries(interactiveWorkerProfileSpec.jobs).map(([key, spec]) => [
        key,
        Object.freeze({
          ...spec,
          priority:
            key === "near-surface" || key === "mid-surface"
              ? spec.priority + 30
              : spec.priority,
          levels: {
            low: {
              ...spec.levels.low,
              estimatedCostMs: Number((spec.levels.low.estimatedCostMs * 1.1).toFixed(2)),
            },
            medium: {
              ...spec.levels.medium,
              estimatedCostMs: Number((spec.levels.medium.estimatedCostMs * 1.15).toFixed(2)),
            },
            high: {
              ...spec.levels.high,
              estimatedCostMs: Number((spec.levels.high.estimatedCostMs * 1.2).toFixed(2)),
            },
          },
        }),
      ])
    ) as Record<string, WorkerJobSpec>
  ),
});

const fluidWorkerProfileSpecs: Readonly<Record<FluidProfileName, WorkerProfileSpec>> =
  Object.freeze({
    interactive: interactiveWorkerProfileSpec,
    cinematic: cinematicWorkerProfileSpec,
  });

const interactiveSimulationStages: readonly FluidSimulationPlanStage[] = Object.freeze(
  [
    createSimulationStage({
      id: "snapshot-ingest",
      label: simulationStageLabels["snapshot-ingest"],
      queueClass: "simulation",
      root: true,
      dependencies: [],
      output: "physics-snapshot",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "spectrum-advance",
      label: simulationStageLabels["spectrum-advance"],
      queueClass: "simulation",
      root: true,
      dependencies: [],
      output: "wave-spectrum",
      snapshotStable: false,
    }),
    createSimulationStage({
      id: "boundary-coupling",
      label: simulationStageLabels["boundary-coupling"],
      queueClass: "simulation",
      root: false,
      dependencies: ["snapshot-ingest"],
      output: "boundary-constraints",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "surface-solve",
      label: simulationStageLabels["surface-solve"],
      queueClass: "simulation",
      root: false,
      dependencies: ["boundary-coupling", "spectrum-advance"],
      output: "surface-state",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "near-surface",
      label: simulationStageLabels["near-surface"],
      queueClass: "render",
      root: false,
      dependencies: ["surface-solve"],
      output: "near-surface-representation",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "mid-surface",
      label: simulationStageLabels["mid-surface"],
      queueClass: "render",
      root: false,
      dependencies: ["surface-solve"],
      output: "mid-surface-representation",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "far-proxy",
      label: simulationStageLabels["far-proxy"],
      queueClass: "render",
      root: false,
      dependencies: ["spectrum-advance"],
      output: "far-proxy-representation",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "horizon-shell",
      label: simulationStageLabels["horizon-shell"],
      queueClass: "render",
      root: false,
      dependencies: ["spectrum-advance"],
      output: "horizon-shell-representation",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "foam-history",
      label: simulationStageLabels["foam-history"],
      queueClass: "render",
      root: false,
      dependencies: ["near-surface", "mid-surface"],
      output: "foam-history-state",
      snapshotStable: true,
    }),
    createSimulationStage({
      id: "render-snapshot",
      label: simulationStageLabels["render-snapshot"],
      queueClass: "render",
      root: false,
      dependencies: [
        "near-surface",
        "mid-surface",
        "far-proxy",
        "horizon-shell",
        "foam-history",
      ],
      output: "fluid-render-snapshot",
      snapshotStable: true,
    }),
  ]
);

const cinematicSimulationStages: readonly FluidSimulationPlanStage[] = Object.freeze(
  interactiveSimulationStages.map((stage) =>
    stage.id === "far-proxy" || stage.id === "horizon-shell"
      ? Object.freeze({
          ...stage,
          output: stage.id === "far-proxy"
            ? "far-proxy-representation-cinematic"
            : "horizon-shell-representation-cinematic",
        })
      : stage
  )
);

const fluidSimulationPlanSpecs: Readonly<
  Record<FluidProfileName, readonly FluidSimulationPlanStage[]>
> = Object.freeze({
  interactive: interactiveSimulationStages,
  cinematic: cinematicSimulationStages,
});

/**
 * Returns the normalized worker manifest for the selected fluid profile.
 */
export function getFluidWorkerManifest(
  profile: FluidProfileName = defaultFluidProfile
): FluidWorkerManifest {
  const profileName = normalizeFluidProfile(profile);
  const spec = fluidWorkerProfileSpecs[profileName];

  return Object.freeze({
    schemaVersion: 1,
    owner: "fluid",
    profile: profileName,
    schedulerMode: "dag",
    description: spec.description,
    suggestedAllocationIds: spec.suggestedAllocationIds,
    jobs: Object.freeze(
      Object.entries(spec.jobs).map(([key, jobSpec]) =>
        buildManifestJob(profileName, key, jobSpec)
      )
    ),
  });
}

/**
 * Creates the high-level fluid simulation and scene-preparation plan for the
 * selected profile.
 */
export function createFluidSimulationPlan(
  profile: FluidProfileName = defaultFluidProfile
): FluidSimulationPlan {
  const profileName = normalizeFluidProfile(profile);
  const stages = fluidSimulationPlanSpecs[profileName];

  return Object.freeze({
    schemaVersion: 1,
    owner: "fluid",
    profile: profileName,
    description: fluidWorkerProfileSpecs[profileName].description,
    snapshotSource: Object.freeze({
      packageName: "@plasius/gpu-physics",
      contract: "physics.worldSnapshot",
      stage: "snapshot-ingest",
      required: true,
    }),
    continuityContract: Object.freeze({
      strategy: "shared-spectrum",
      requiresSharedWaveField: true,
      bands: fluidRepresentationBands,
    }),
    stages,
  });
}
