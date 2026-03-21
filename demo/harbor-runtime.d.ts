export type FluidVector2 = {
  x: number;
  z: number;
};

export type FluidVector3 = {
  x: number;
  y: number;
  z: number;
};

export type FluidWaveSettings = {
  primaryDirection: FluidVector2;
  driftMetersPerSecond: number;
  secondaryDirection: FluidVector2;
  chopDirection: FluidVector2;
  amplitudeBias: number;
  harmonicWeight: number;
  chopWeight: number;
  rippleFrequency: number;
  phaseSpeed: number;
  wakeStrength: number;
  wakeRadius: number;
  wakeLength: number;
  collisionStrength: number;
  collisionRadius: number;
};

export type FluidWaveImpulse = {
  origin: FluidVector2;
  strength: number;
  age: number;
  radiusGrowth: number;
  decay: number;
};

export function buildHeightFieldNormals(
  positions: FluidVector3[],
  rows: number,
  cols: number,
): FluidVector3[];

export function reflectPointAcrossPlane(
  point: FluidVector3,
  planeY: number,
  sink?: number,
): FluidVector3;

export function computeShipFloatOffset(
  bounds: { min: readonly number[]; max: readonly number[] },
  physics?: Record<string, unknown>,
  scale?: number,
): number;

export function createWaveFieldSettings(
  visuals?: Record<string, unknown>,
): FluidWaveSettings;

export function sampleDirectionalWaveField(
  x: number,
  z: number,
  time: number,
  amplitude: number,
  settings: FluidWaveSettings,
): number;

export function createFluidWaveImpulse(
  origin: FluidVector2,
  strength: number,
  options?: Partial<FluidWaveImpulse>,
): FluidWaveImpulse;

export function sampleFluidWakeField(
  state: Record<string, unknown>,
  visuals: Record<string, unknown>,
  x: number,
  z: number,
  settings: FluidWaveSettings,
): number;

export function sampleFluidCollisionField(
  state: Record<string, unknown>,
  x: number,
  z: number,
  settings: FluidWaveSettings,
): number;

export function sampleFluidSurfaceHeight(
  state: Record<string, unknown>,
  visuals: Record<string, unknown>,
  x: number,
  z: number,
  options?: { settings?: FluidWaveSettings },
): number;
