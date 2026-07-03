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
 * Simulated fluid materials. Foam, spray, and steam are render byproducts of
 * these fluids rather than independent simulated volume materials.
 */
export const fluidMaterialKinds = ["water", "lava", "sludge"] as const;

/**
 * Fluid material carried by simulation cells.
 */
export type FluidMaterialKind = (typeof fluidMaterialKinds)[number];

/**
 * Stable identifier for one chunk in a chunked fluid simulation.
 */
export interface FluidSimulationChunkKey {
  fluidBodyId: string;
  cx: number;
  cy: number;
  cz: number;
}

/**
 * Per-cell fluid state exposed for inspection and deterministic testing.
 */
export interface FluidCellState {
  volumeFraction: number;
  pressure: number;
  velocity: readonly [number, number, number];
  material: FluidMaterialKind;
  temperatureKelvin: number;
  foam: number;
}

/**
 * Chunked voxel volume used by near-field fluid simulation.
 */
export interface FluidVoxelVolume {
  schemaVersion: 1;
  owner: "fluid";
  chunkKey: Readonly<FluidSimulationChunkKey>;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxelSize: number;
  material: FluidMaterialKind;
  volumeFraction: Float32Array;
  pressure: Float32Array;
  velocity: Float32Array;
  temperatureKelvin: Float32Array;
  foam: Float32Array;
}

/**
 * Solid terrain/collider constraints consumed by the fluid solver.
 */
export interface FluidBoundaryField {
  schemaVersion: 1;
  owner: "fluid";
  chunkKey: Readonly<FluidSimulationChunkKey>;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxelSize: number;
  solid: Uint8Array;
  openBoundaryMask: number;
}

/**
 * Runtime source/sink event applied to a volume step.
 */
export interface FluidSourceSink {
  id: string;
  kind: "source" | "sink";
  material: FluidMaterialKind;
  center: readonly [number, number, number];
  radius: number;
  rate: number;
  temperatureKelvin?: number;
}

/**
 * Metrics emitted by one deterministic simulation step.
 */
export interface FluidSimulationStep {
  schemaVersion: 1;
  owner: "fluid";
  chunkKey: Readonly<FluidSimulationChunkKey>;
  dt: number;
  material: FluidMaterialKind;
  massBefore: number;
  massAfter: number;
  maxDivergenceBefore: number;
  maxDivergenceAfter: number;
  changedCellCount: number;
}

/**
 * Solver output returned after applying one step.
 */
export interface FluidSimulationStepResult {
  volume: FluidVoxelVolume;
  step: Readonly<FluidSimulationStep>;
}

/**
 * Extracted render surface from simulated volume state.
 */
export interface FluidFreeSurfaceMesh {
  schemaVersion: 1;
  owner: "fluid";
  chunkKey: Readonly<FluidSimulationChunkKey>;
  material: FluidMaterialKind;
  materialId: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  foam: Float32Array;
  bounds: Readonly<{
    min: readonly [number, number, number];
    max: readonly [number, number, number];
  }>;
}

/**
 * Renderer-facing state derived from the real simulation volume.
 */
export interface FluidSimulationRenderSnapshot {
  schemaVersion: 1;
  owner: "fluid";
  chunkKey: Readonly<FluidSimulationChunkKey>;
  material: FluidMaterialKind;
  volume: Readonly<FluidVoxelVolume>;
  freeSurface: Readonly<FluidFreeSurfaceMesh>;
  step: Readonly<FluidSimulationStep> | null;
}

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
 * Texture-oriented shading input for fluid materials.
 */
export interface FluidMaterialTextureDescriptor {
  kind: "normal" | "height" | "foam" | "baseColor";
  assetId: string;
  uvScale: readonly [number, number] | readonly number[];
  strength: number;
}

/**
 * Authored medium carried by a fluid surface.
 */
export interface FluidSurfaceMediumDescriptor {
  id: string;
  density: number;
  attenuationColor: readonly [number, number, number, number] | readonly number[];
  attenuationDistance: number;
  absorption: readonly [number, number, number] | readonly number[];
  scattering: readonly [number, number, number] | readonly number[];
}

/**
 * Water-facing material descriptor for renderer integration.
 */
export interface FluidSurfaceMaterialDescriptor {
  id: string;
  shadingModel: "water" | "lava" | "sludge" | "foam" | "steam-spray";
  baseColor: readonly [number, number, number, number] | readonly number[];
  roughness: number;
  metallic: number;
  opacity: number;
  ior: number;
  transmission: number;
  specular: number;
  emissive: readonly [number, number, number] | readonly number[];
  absorption: readonly [number, number, number] | readonly number[];
  caustics: boolean;
  foam: boolean;
  foamAmount: number;
  normalTexture: Readonly<FluidMaterialTextureDescriptor> | null;
  heightTexture: Readonly<FluidMaterialTextureDescriptor> | null;
  foamTexture: Readonly<FluidMaterialTextureDescriptor> | null;
  mediumId: string;
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
  material: Readonly<FluidSurfaceMaterialDescriptor>;
  medium: Readonly<FluidSurfaceMediumDescriptor>;
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
 * Geometry payload passed from a fluid package into a wavefront scene adapter.
 */
export interface FluidWavefrontSceneSourceMeshInput {
  id: string;
  fluidBodyId: string;
  representationBand: FluidRepresentationBand;
  rtParticipation: FluidRtParticipation;
  accelerationStructureUpdateClass: "deforming" | "proxy" | "static";
  materialId: string;
  mediumId: string;
  positions: readonly number[];
  normals: readonly number[] | null;
  tangents: readonly number[] | null;
  uvs: readonly number[] | null;
  derivableUvs: Readonly<{
    enabled: boolean;
    projection: "planar" | "world-xz";
    scale: readonly [number, number] | readonly number[];
  }>;
  indices: readonly number[];
}

/**
 * Renderer-facing fluid scene source payload.
 */
export interface FluidWavefrontSceneSourceAdapterOutput {
  schemaVersion: 1;
  owner: "fluid";
  adapterId: string;
  fluidBodyId: string;
  material: Readonly<FluidSurfaceMaterialDescriptor>;
  medium: Readonly<FluidSurfaceMediumDescriptor>;
  mesh: Readonly<FluidWavefrontSceneSourceMeshInput>;
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
  "volume-advection",
  "pressure-projection",
  "spectrum-advance",
  "boundary-coupling",
  "free-surface-extraction",
  "surface-band-update",
  "foam-spray-mask",
  "near-surface",
  "mid-surface",
  "far-proxy",
  "horizon-shell",
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
