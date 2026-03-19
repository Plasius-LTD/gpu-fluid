/**
 * Supported fluid planning profiles.
 */
export const fluidProfileNames = ["interactive", "cinematic"] as const;

/**
 * Fluid planning profile identifier.
 */
export type FluidProfileName = (typeof fluidProfileNames)[number];

/**
 * Fluid body categories currently modeled by the package.
 */
export const fluidBodyKinds = [
  "ocean",
  "lake",
  "river",
  "waterfall",
  "custom",
] as const;

/**
 * Fluid body kind.
 */
export type FluidBodyKind = (typeof fluidBodyKinds)[number];

/**
 * Distance-banded representation tiers.
 */
export const fluidRepresentationBands = [
  "near",
  "mid",
  "far",
  "horizon",
] as const;

/**
 * Supported distance band name.
 */
export type FluidRepresentationBand = (typeof fluidRepresentationBands)[number];

/**
 * Supported render outputs for each fluid band.
 */
export const fluidRepresentationOutputs = [
  "liveSurface",
  "simplifiedSurface",
  "mergedProxy",
  "horizonShell",
] as const;

/**
 * Render output type for a banded fluid representation.
 */
export type FluidRepresentationOutput =
  (typeof fluidRepresentationOutputs)[number];

/**
 * Fluid continuity strategies across range transitions.
 */
export const fluidContinuityStrategies = [
  "shared-spectrum",
  "shared-heightfield",
  "phase-locked-proxy",
] as const;

/**
 * Continuity strategy identifier.
 */
export type FluidContinuityStrategy =
  (typeof fluidContinuityStrategies)[number];

/**
 * Coarse RT participation level for a representation.
 */
export const fluidRtParticipationModes = [
  "full",
  "selective",
  "proxy",
  "disabled",
] as const;

/**
 * RT participation mode.
 */
export type FluidRtParticipation = (typeof fluidRtParticipationModes)[number];

/**
 * Shadow-source mode for a fluid representation.
 */
export const fluidShadowModes = [
  "ray-traced-primary",
  "selective-raster",
  "proxy-caster",
  "baked-impression",
] as const;

/**
 * Shadow mode identifier.
 */
export type FluidShadowMode = (typeof fluidShadowModes)[number];

/**
 * Worker queues used by fluid preparation.
 */
export const fluidWorkerQueueClasses = ["simulation", "render"] as const;

/**
 * Worker queue class.
 */
export type FluidWorkerQueueClass =
  (typeof fluidWorkerQueueClasses)[number];

/**
 * Safety classification for fluid jobs.
 */
export const fluidWorkerAuthorities = [
  "visual",
  "non-authoritative-simulation",
  "authoritative",
] as const;

/**
 * Worker authority classification.
 */
export type FluidWorkerAuthority =
  (typeof fluidWorkerAuthorities)[number];

/**
 * Importance ranking for fluid jobs.
 */
export const fluidWorkerImportances = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

/**
 * Worker importance classification.
 */
export type FluidWorkerImportance =
  (typeof fluidWorkerImportances)[number];

/**
 * Domains aligned with `@plasius/gpu-performance`.
 */
export const fluidPerformanceDomains = [
  "physics",
  "geometry",
  "custom",
] as const;

/**
 * Performance domain used by fluid jobs.
 */
export type FluidPerformanceDomain =
  (typeof fluidPerformanceDomains)[number];

/**
 * Motion classes aligned with `@plasius/gpu-performance`.
 */
export const fluidMotionClasses = ["stable", "dynamic", "volatile"] as const;

/**
 * Motion class.
 */
export type FluidMotionClass = (typeof fluidMotionClasses)[number];

/**
 * Quality emphasis weights aligned with `@plasius/gpu-performance`.
 */
export interface FluidPerformanceQualityDimensions {
  geometry?: number;
  shading?: number;
  rayTracing?: number;
  updateCadence?: number;
  temporalReuse?: number;
}

/**
 * Additional signals aligned with `@plasius/gpu-performance`.
 */
export interface FluidPerformanceImportanceSignals {
  visible?: boolean;
  playerRelevant?: boolean;
  imageCritical?: boolean;
  motionClass?: FluidMotionClass;
  shadowSignificance?: FluidWorkerImportance;
}

/**
 * User-supplied band continuity overrides.
 */
export interface FluidContinuityBandInput {
  blendWindowMeters?: number;
  amplitudeFloor?: number;
  frequencyFloor?: number;
  retainFoamHistory?: boolean;
  retainLowFrequencyWaves?: boolean;
  retainDirectionality?: boolean;
}

/**
 * User-supplied continuity envelope input.
 */
export interface FluidContinuityEnvelopeInput {
  fluidBodyId: string;
  continuityGroupId?: string;
  waveFieldId?: string;
  strategy?: FluidContinuityStrategy;
  bands?: Partial<Record<FluidRepresentationBand, FluidContinuityBandInput>>;
}

/**
 * Normalized continuity settings for one band.
 */
export interface FluidContinuityBandSettings {
  inheritsFromBand?: FluidRepresentationBand;
  blendWindowMeters: number;
  amplitudeFloor: number;
  frequencyFloor: number;
  retainFoamHistory: boolean;
  retainLowFrequencyWaves: boolean;
  retainDirectionality: boolean;
}

/**
 * Shared continuity contract across all bands.
 */
export interface FluidContinuityEnvelope {
  schemaVersion: 1;
  owner: "fluid";
  fluidBodyId: string;
  continuityGroupId: string;
  waveFieldId: string;
  strategy: FluidContinuityStrategy;
  bands: Readonly<Record<FluidRepresentationBand, FluidContinuityBandSettings>>;
}

/**
 * Range thresholds used to select a fluid band.
 */
export interface FluidRangeThresholds {
  nearMaxMeters: number;
  midMaxMeters: number;
  farMaxMeters: number;
}

/**
 * Resolution hints for a representation band.
 */
export interface FluidMeshResolution {
  patchSizeMeters: number;
  subdivisions: number;
  activeWaveOctaves: number;
  foamLayers: number;
}

/**
 * Shading hints for a representation band.
 */
export interface FluidShadingPlan {
  mode: "full" | "balanced" | "proxy" | "horizon";
  caustics: boolean;
  reflectionMode: "full" | "selective" | "proxy" | "disabled";
}

/**
 * Per-band scheduling and performance hints.
 */
export interface FluidRepresentationPerformanceHints {
  owner: "fluid";
  queueClass: "render";
  priorityHint: number;
  importance: FluidWorkerImportance;
  representationBand: FluidRepresentationBand;
  qualityDimensions: Readonly<FluidPerformanceQualityDimensions>;
  importanceSignals: Readonly<FluidPerformanceImportanceSignals>;
}

/**
 * Normalized representation descriptor for a single band.
 */
export interface FluidRepresentationDescriptor {
  id: string;
  fluidBodyId: string;
  kind: FluidBodyKind;
  profile: FluidProfileName;
  band: FluidRepresentationBand;
  output: FluidRepresentationOutput;
  mesh: Readonly<FluidMeshResolution>;
  updateCadenceDivisor: number;
  rtParticipation: FluidRtParticipation;
  shadowMode: FluidShadowMode;
  shading: Readonly<FluidShadingPlan>;
  continuity: Readonly<FluidContinuityBandSettings> & {
    continuityGroupId: string;
    waveFieldId: string;
    strategy: FluidContinuityStrategy;
  };
  performance: Readonly<FluidRepresentationPerformanceHints>;
}

/**
 * Options for creating a representation plan.
 */
export interface FluidRepresentationPlanOptions {
  fluidBodyId: string;
  kind?: FluidBodyKind;
  profile?: FluidProfileName;
  supportsRayTracing?: boolean;
  nearFieldMaxMeters?: number;
  midFieldMaxMeters?: number;
  farFieldMaxMeters?: number;
  continuity?: Partial<Omit<FluidContinuityEnvelopeInput, "fluidBodyId">>;
}

/**
 * Full fluid representation plan.
 */
export interface FluidRepresentationPlan {
  schemaVersion: 1;
  owner: "fluid";
  fluidBodyId: string;
  kind: FluidBodyKind;
  profile: FluidProfileName;
  supportsRayTracing: boolean;
  thresholds: Readonly<FluidRangeThresholds>;
  continuity: Readonly<FluidContinuityEnvelope>;
  bands: readonly FluidRepresentationBand[];
  representations: readonly FluidRepresentationDescriptor[];
}

/**
 * One quality level in a worker budget ladder.
 */
export interface FluidWorkerBudgetLevel {
  id: string;
  estimatedCostMs: number;
  config: Readonly<{
    maxDispatchesPerFrame: number;
    maxJobsPerDispatch: number;
    cadenceDivisor: number;
    workgroupScale: number;
    maxQueueDepth: number;
    metadata: Readonly<{
      owner: "fluid";
      queueClass: FluidWorkerQueueClass;
      jobType: string;
      quality: "low" | "medium" | "high";
    }>;
  }>;
}

/**
 * Single worker job emitted by the fluid package.
 */
export interface FluidWorkerManifestJob {
  key: string;
  label: string;
  worker: Readonly<{
    jobType: string;
    queueClass: FluidWorkerQueueClass;
    priority: number;
    dependencies: readonly string[];
    schedulerMode: "dag";
  }>;
  performance: Readonly<{
    id: string;
    jobType: string;
    queueClass: FluidWorkerQueueClass;
    domain: FluidPerformanceDomain;
    authority: FluidWorkerAuthority;
    importance: FluidWorkerImportance;
    representationBand?: FluidRepresentationBand;
    qualityDimensions?: Readonly<FluidPerformanceQualityDimensions>;
    importanceSignals?: Readonly<FluidPerformanceImportanceSignals>;
    levels: readonly FluidWorkerBudgetLevel[];
  }>;
  debug: Readonly<{
    owner: "fluid";
    queueClass: FluidWorkerQueueClass;
    jobType: string;
    tags: readonly string[];
    suggestedAllocationIds: readonly string[];
  }>;
}

/**
 * Worker manifest compatible with `@plasius/gpu-worker` and
 * `@plasius/gpu-performance`.
 */
export interface FluidWorkerManifest {
  schemaVersion: 1;
  owner: "fluid";
  profile: FluidProfileName;
  schedulerMode: "dag";
  description: string;
  suggestedAllocationIds: readonly string[];
  jobs: readonly FluidWorkerManifestJob[];
}

/**
 * Ordered fluid simulation stages.
 */
export const fluidSimulationStageOrder = [
  "snapshot-ingest",
  "spectrum-advance",
  "boundary-coupling",
  "surface-solve",
  "near-surface",
  "mid-surface",
  "far-proxy",
  "horizon-shell",
  "foam-history",
  "render-snapshot",
] as const;

/**
 * Fluid simulation stage identifier.
 */
export type FluidSimulationStageId =
  (typeof fluidSimulationStageOrder)[number];

/**
 * One stage in the fluid simulation/scene-prep plan.
 */
export interface FluidSimulationPlanStage {
  id: FluidSimulationStageId;
  label: string;
  queueClass: FluidWorkerQueueClass;
  root: boolean;
  dependencies: readonly FluidSimulationStageId[];
  output: string;
  snapshotStable: boolean;
}

/**
 * High-level simulation plan for the fluid package.
 */
export interface FluidSimulationPlan {
  schemaVersion: 1;
  owner: "fluid";
  profile: FluidProfileName;
  description: string;
  snapshotSource: Readonly<{
    packageName: "@plasius/gpu-physics";
    contract: "physics.worldSnapshot";
    stage: "snapshot-ingest";
    required: true;
  }>;
  continuityContract: Readonly<{
    strategy: FluidContinuityStrategy;
    requiresSharedWaveField: true;
    bands: readonly FluidRepresentationBand[];
  }>;
  stages: readonly FluidSimulationPlanStage[];
}
