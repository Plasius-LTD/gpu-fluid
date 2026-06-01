import { fluidRepresentationBands } from "./types.js";
import type {
  FluidRepresentationBand,
  FluidWaterSurfaceExclusionPolygon,
  FluidWaterFoamPatch,
  FluidWaterImpulse,
  FluidWaterMotionEffects,
  FluidWaterMotionEffectsInput,
  FluidWaterParticle,
  FluidWaterRippleRing,
  FluidWaterSurfaceZoneBoundary,
  FluidWaterSurfaceZoneInput,
  FluidWaterSurfaceZoneLayout,
  FluidWaterSurfaceZoneLayoutInput,
  FluidWaterSurfaceZoneMesh,
  FluidWaterSurfaceZoneStitch,
  FluidWaterSurfaceZoneVertex,
  FluidWaterSurfaceNormal,
  FluidWaterSurfaceNormalInput,
  FluidWaterSurfaceSample,
  FluidWaterSurfaceSampleInput,
  FluidWaterSurfaceSettings,
  FluidWaterSurfaceSettingsInput,
  FluidWaterVector3,
  FluidWaterVessel,
  FluidWaterWakeTrail,
} from "./types.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function assertFiniteNumber(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

function readPositiveInteger(value: unknown, fallback: number, minimum: number): number {
  return Math.max(minimum, Math.floor(readNumber(value, fallback)));
}

function smoothstep(min: number, max: number, value: number): number {
  const t = clamp((value - min) / Math.max(0.0001, max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function vec3(x = 0, y = 0, z = 0): Required<FluidWaterVector3> {
  return { x, y, z };
}

function addVec3(a: FluidWaterVector3, b: FluidWaterVector3): Required<FluidWaterVector3> {
  return vec3(a.x + b.x, (a.y ?? 0) + (b.y ?? 0), a.z + b.z);
}

function scaleVec3(a: FluidWaterVector3, scalar: number): Required<FluidWaterVector3> {
  return vec3(a.x * scalar, (a.y ?? 0) * scalar, a.z * scalar);
}

function normalizeVec3(vector: FluidWaterVector3): Required<FluidWaterVector3> {
  const length = Math.hypot(vector.x, vector.y ?? 0, vector.z) || 1;
  return vec3(vector.x / length, (vector.y ?? 0) / length, vector.z / length);
}

function dotPlanar(a: FluidWaterVector3, b: FluidWaterVector3): number {
  return a.x * b.x + a.z * b.z;
}

function normalizePlanarDirection(x: number, z: number): Required<FluidWaterVector3> {
  const length = Math.hypot(x, z) || 1;
  return vec3(x / length, 0, z / length);
}

function perpendicularOnWater(direction: FluidWaterVector3): Required<FluidWaterVector3> {
  return vec3(-direction.z, 0, direction.x);
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + seed * seed * 0.0017) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Normalizes water-surface controls shared by near/mid/far renderers.
 */
export function createFluidWaterSurfaceSettings(
  input: FluidWaterSurfaceSettingsInput = {}
): FluidWaterSurfaceSettings {
  const primaryDirection = normalizePlanarDirection(
    input.waveDirection?.x ?? 0.88,
    input.waveDirection?.z ?? 0.28
  );
  const phaseSpeed = readNumber(input.wavePhaseSpeed, 0.88);

  return Object.freeze({
    waveAmplitude: readNumber(input.waveAmplitude, 1),
    waveDirection: Object.freeze({ x: primaryDirection.x, z: primaryDirection.z }),
    wavePhaseSpeed: phaseSpeed,
    primaryDirection,
    lateralDirection: perpendicularOnWater(primaryDirection),
    driftMetersPerSecond: phaseSpeed * 5.8,
    wakeStrength: readNumber(input.wakeStrength, 0.31),
    wakeLength: readNumber(input.wakeLength, 18),
    wakeWidth: readNumber(input.wakeWidth, 2.6),
    wakeFrequency: readNumber(input.wakeFrequency, 1.72),
    hullInfluence: readNumber(input.hullInfluence, 0.08),
    collisionRippleStrength: readNumber(input.collisionRippleStrength, 0.42),
    collisionRippleSpeed: readNumber(input.collisionRippleSpeed, 4.6),
    collisionRippleWidth: readNumber(input.collisionRippleWidth, 3.8),
    collisionRippleFrequency: readNumber(input.collisionRippleFrequency, 1.48),
    collisionRippleDecay: readNumber(input.collisionRippleDecay, 0.6),
  });
}

/**
 * Samples the shared low-frequency directional wave spectrum.
 */
export function sampleFluidDirectionalWaveField(
  x: number,
  z: number,
  time: number,
  settings: FluidWaterSurfaceSettings = createFluidWaterSurfaceSettings()
): number {
  const point = vec3(x, 0, z);
  const along = dotPlanar(point, settings.primaryDirection);
  const cross = dotPlanar(point, settings.lateralDirection);
  const phaseSpeed = settings.wavePhaseSpeed;

  return (
    (Math.sin(along * 0.22 - time * 1.12 * phaseSpeed) * 0.42 +
      Math.cos(along * 0.11 + cross * 0.07 - time * 0.78 * phaseSpeed) * 0.26 +
      Math.sin(cross * 0.19 - time * 1.34 * phaseSpeed) * 0.16) *
    settings.waveAmplitude
  );
}

/**
 * Samples Kelvin wake and bow displacement contributed by moving vessels.
 */
export function sampleFluidVesselWakeField(
  vessels: readonly FluidWaterVessel[] = [],
  x: number,
  z: number,
  time: number,
  settings: FluidWaterSurfaceSettings = createFluidWaterSurfaceSettings(),
  options: { excludeVesselId?: string } = {}
): number {
  let total = 0;

  for (const vessel of vessels) {
    if (vessel.id && vessel.id === options.excludeVesselId) {
      continue;
    }

    const speed = Math.hypot(vessel.velocity.x, vessel.velocity.z);
    if (speed < 0.12) {
      continue;
    }

    const heading = normalizePlanarDirection(vessel.velocity.x, vessel.velocity.z);
    const trailing = scaleVec3(heading, -1);
    const lateral = perpendicularOnWater(heading);
    const wakeStrength = readNumber(vessel.wakeStrength, settings.wakeStrength);
    const wakeLength = readNumber(vessel.wakeLength, settings.wakeLength);
    const stern = addVec3(vessel.position, scaleVec3(heading, -2.6));
    const rel = vec3(x - stern.x, 0, z - stern.z);
    const along = dotPlanar(rel, trailing);
    if (along < 0 || along > wakeLength) {
      continue;
    }

    const cross = dotPlanar(rel, lateral);
    const centerWidth = 0.55 + along * 0.035;
    const transverseWidth = mix(0.9, 2.9, clamp(along / wakeLength, 0, 1));
    const armSpread = along * 0.42;
    const armWidth = mix(0.28, 1.2, clamp(along / wakeLength, 0, 1));
    const lengthFade = Math.exp(-along * 0.12);
    const centerEnvelope =
      Math.exp(-along * 0.2) *
      Math.exp(-((cross * cross) / Math.max(0.08, centerWidth * centerWidth * 2.1)));
    const transverseEnvelope =
      lengthFade *
      Math.exp(-((cross * cross) / Math.max(0.2, transverseWidth * transverseWidth * 1.9)));
    const armDistance = Math.abs(cross - armSpread);
    const armEnvelope =
      Math.exp(-along * 0.095) *
      Math.exp(-((armDistance * armDistance) / Math.max(0.04, armWidth * armWidth * 1.6)));
    const centerWave =
      Math.sin(along * 3.15 - time * 6.2) * centerEnvelope * 0.34 +
      Math.sin((along + cross) * 5.1 - time * 8.4) * centerEnvelope * 0.12;
    const transverseWave =
      Math.sin(along * 1.48 - time * 3.7) * transverseEnvelope * 0.34;
    const armWave =
      Math.sin(along * 1.26 + cross * 0.72 - time * 3.1) * armEnvelope * 0.68;

    total += (centerWave + transverseWave + armWave) * speed * wakeStrength;
  }

  return total;
}

function resolveImpulseOrigin(impulse: FluidWaterImpulse): Required<FluidWaterVector3> {
  const origin = impulse.origin ?? { x: impulse.x ?? 0, y: 0, z: impulse.z ?? 0 };
  return vec3(origin.x, origin.y ?? 0, origin.z);
}

/**
 * Samples expanding collision and impact ripples.
 */
export function sampleFluidImpulseField(
  impulses: readonly FluidWaterImpulse[] = [],
  x: number,
  z: number,
  time: number,
  settings: FluidWaterSurfaceSettings = createFluidWaterSurfaceSettings()
): number {
  let total = 0;

  for (const impulse of impulses) {
    const origin = resolveImpulseOrigin(impulse);
    const distance = Math.hypot(x - origin.x, z - origin.z);

    if (typeof impulse.life === "number") {
      const radius = readNumber(impulse.radius, 1) + (1 - impulse.life) * 4.8;
      if (distance > radius * 2.8) {
        continue;
      }
      const phase = distance * 1.8 - (1 - impulse.life) * 10 - time * 0.4;
      const envelope = Math.exp(-distance / Math.max(0.1, radius)) * impulse.life;
      total +=
        Math.sin(phase) *
        impulse.strength *
        settings.collisionRippleStrength *
        envelope *
        0.18;
      continue;
    }

    const age = readNumber(impulse.age, 0);
    const radius = age * readNumber(impulse.radiusGrowth, settings.collisionRippleSpeed);
    const bandWidth = readNumber(impulse.bandWidth, settings.collisionRippleWidth);
    const front = distance - radius;
    if (Math.abs(front) > bandWidth) {
      continue;
    }
    const envelope =
      Math.exp(-(front * front) / (bandWidth * bandWidth * 0.82)) *
      Math.exp(-age * readNumber(impulse.decayRate, settings.collisionRippleDecay));
    total +=
      Math.sin(front * readNumber(impulse.frequency, settings.collisionRippleFrequency) - age * settings.collisionRippleSpeed) *
      impulse.strength *
      settings.collisionRippleStrength *
      envelope;
  }

  return total;
}

/**
 * Samples the shared water surface and returns decomposed wave, wake, and impulse terms.
 */
export function sampleFluidWaterSurface(
  input: FluidWaterSurfaceSampleInput
): FluidWaterSurfaceSample {
  const settings = input.settings ?? createFluidWaterSurfaceSettings(input);
  const baseHeight = sampleFluidDirectionalWaveField(input.x, input.z, input.time, settings);
  const wakeHeight = sampleFluidVesselWakeField(
    input.vessels,
    input.x,
    input.z,
    input.time,
    settings,
    { excludeVesselId: input.excludeVesselId }
  );
  const impulseHeight = sampleFluidImpulseField(
    input.impulses,
    input.x,
    input.z,
    input.time,
    settings
  );

  return Object.freeze({
    height: baseHeight + wakeHeight + impulseHeight,
    baseHeight,
    wakeHeight,
    impulseHeight,
  });
}

/**
 * Samples a smoothed finite-difference normal from the shared water surface.
 */
export function sampleFluidWaterSurfaceNormal(
  input: FluidWaterSurfaceNormalInput
): FluidWaterSurfaceNormal {
  const settings = input.settings ?? createFluidWaterSurfaceSettings(input);
  const sampleDistance = clamp(readNumber(input.sampleDistance, 0.72), 0.18, 3.4);
  const verticalScale = readNumber(input.verticalScale, 1);
  const sampleHeight = (x: number, z: number): number =>
    sampleFluidWaterSurface({
      ...input,
      x,
      z,
      settings,
    }).height * verticalScale;

  const left = sampleHeight(input.x - sampleDistance, input.z);
  const right = sampleHeight(input.x + sampleDistance, input.z);
  const near = sampleHeight(input.x, input.z - sampleDistance);
  const far = sampleHeight(input.x, input.z + sampleDistance);
  const dx = (right - left) / (sampleDistance * 2);
  const dz = (far - near) / (sampleDistance * 2);
  const normal = normalizeVec3(vec3(-dx, 1, -dz));

  return Object.freeze({
    normal: Object.freeze(normal),
    tangentX: Object.freeze(normalizeVec3(vec3(1, dx, 0))),
    tangentZ: Object.freeze(normalizeVec3(vec3(0, dz, 1))),
    slope: Math.hypot(dx, dz),
  });
}

type NormalizedSurfaceZone = {
  id: string;
  band: FluidRepresentationBand;
  minZ: number;
  maxZ: number;
  startWidthMeters: number;
  endWidthMeters: number;
  centerX: number;
  rows: number;
  columns: number;
  baseHeightStart: number;
  baseHeightEnd: number;
  verticalScaleStart: number;
  verticalScaleEnd: number;
  frequencyFloor: number;
};

function normalizeSurfaceZone(
  zone: FluidWaterSurfaceZoneInput,
  index: number,
  continuity: FluidWaterSurfaceZoneLayoutInput["continuity"]
): NormalizedSurfaceZone {
  if (!fluidRepresentationBands.includes(zone.band)) {
    throw new TypeError(`zones[${index}].band must be a supported fluid representation band.`);
  }

  const minZ = assertFiniteNumber(`zones[${index}].minZ`, zone.minZ);
  const maxZ = assertFiniteNumber(`zones[${index}].maxZ`, zone.maxZ);
  if (maxZ <= minZ) {
    throw new RangeError(`zones[${index}].maxZ must be greater than minZ.`);
  }

  const bandContinuity = continuity?.[zone.band];
  const defaultVerticalScale = readNumber(bandContinuity?.amplitudeFloor, 1);
  const fallbackVerticalScale = readNumber(zone.verticalScale, defaultVerticalScale);
  return {
    id: zone.id ?? `${zone.band}-zone-${index}`,
    band: zone.band,
    minZ,
    maxZ,
    startWidthMeters: assertFiniteNumber(
      `zones[${index}].startWidthMeters`,
      zone.startWidthMeters
    ),
    endWidthMeters: assertFiniteNumber(
      `zones[${index}].endWidthMeters`,
      zone.endWidthMeters
    ),
    centerX: readNumber(zone.centerX, 0),
    rows: readPositiveInteger(zone.rows, 8, 2),
    columns: readPositiveInteger(zone.columns, 8, 2),
    baseHeightStart: readNumber(zone.baseHeightStart, 0),
    baseHeightEnd: readNumber(zone.baseHeightEnd, zone.baseHeightStart ?? 0),
    verticalScaleStart: readNumber(zone.verticalScaleStart, fallbackVerticalScale),
    verticalScaleEnd: readNumber(zone.verticalScaleEnd, fallbackVerticalScale),
    frequencyFloor: clamp(readNumber(bandContinuity?.frequencyFloor, 1), 0.08, 1),
  };
}

function pointInsidePolygon(point: FluidWaterVector3, polygon: FluidWaterSurfaceExclusionPolygon): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.points.length - 1; index < polygon.points.length; previous = index, index += 1) {
    const currentPoint = polygon.points[index]!;
    const previousPoint = polygon.points[previous]!;
    const crossesZ = currentPoint.z > point.z !== previousPoint.z > point.z;
    const denominator = previousPoint.z - currentPoint.z;
    const edgeX =
      ((previousPoint.x - currentPoint.x) * (point.z - currentPoint.z)) /
        (Math.abs(denominator) < 0.0001 ? 0.0001 : denominator) +
      currentPoint.x;
    if (crossesZ && point.x < edgeX) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInsideExclusions(
  point: FluidWaterVector3,
  exclusions: readonly FluidWaterSurfaceExclusionPolygon[]
): boolean {
  return exclusions.some((polygon) => polygon.points.length >= 3 && pointInsidePolygon(point, polygon));
}

function freezeExclusions(
  exclusions: readonly FluidWaterSurfaceExclusionPolygon[] = []
): readonly Readonly<FluidWaterSurfaceExclusionPolygon>[] {
  return Object.freeze(
    exclusions.map((exclusion, index) =>
      Object.freeze({
        id: exclusion.id ?? `exclusion-${index}`,
        points: Object.freeze(
          exclusion.points.map((point) => Object.freeze({ x: point.x, z: point.z }))
        ),
      })
    )
  );
}

function stitchSurfaceZones(
  zones: NormalizedSurfaceZone[],
  mode: FluidWaterSurfaceZoneLayoutInput["stitchingMode"] = "shared-boundary"
): readonly Readonly<FluidWaterSurfaceZoneStitch>[] {
  const stitching: FluidWaterSurfaceZoneStitch[] = [];
  const tolerance = 0.0001;

  for (let index = 0; index < zones.length - 1; index += 1) {
    const current = zones[index]!;
    const next = zones[index + 1]!;
    const gap = next.minZ - current.maxZ;
    if (gap < -tolerance) {
      throw new RangeError(`${current.id} overlaps ${next.id}; water zones must not overlap in z.`);
    }
    if (gap > tolerance) {
      throw new RangeError(`${current.id} and ${next.id} leave an unstitched z gap of ${gap}m.`);
    }

    const originalFromWidth = current.endWidthMeters;
    const originalToWidth = next.startWidthMeters;
    if (mode === "strict" && Math.abs(originalFromWidth - originalToWidth) > tolerance) {
      throw new RangeError(
        `${current.id}/${next.id} boundary widths differ; use shared-boundary stitching or align the inputs.`
      );
    }

    const stitchedWidth =
      mode === "shared-boundary"
        ? (originalFromWidth + originalToWidth) * 0.5
        : originalFromWidth;
    current.endWidthMeters = stitchedWidth;
    next.startWidthMeters = stitchedWidth;
    stitching.push(
      Object.freeze({
        fromZoneId: current.id,
        toZoneId: next.id,
        fromBand: current.band,
        toBand: next.band,
        z: current.maxZ,
        widthMeters: stitchedWidth,
        originalFromWidthMeters: originalFromWidth,
        originalToWidthMeters: originalToWidth,
        mode,
      })
    );
  }

  return Object.freeze(stitching);
}

function buildZoneBoundary(
  side: "minZ" | "maxZ",
  z: number,
  widthMeters: number,
  startIndex: number,
  vertexCount: number
): Readonly<FluidWaterSurfaceZoneBoundary> {
  return Object.freeze({ side, z, widthMeters, startIndex, vertexCount });
}

function buildFluidWaterSurfaceZoneMesh(
  zone: NormalizedSurfaceZone,
  input: FluidWaterSurfaceZoneLayoutInput,
  settings: FluidWaterSurfaceSettings,
  exclusions: readonly FluidWaterSurfaceExclusionPolygon[],
  layoutMinZ: number,
  layoutMaxZ: number
): Readonly<FluidWaterSurfaceZoneMesh> {
  const vertices: Readonly<FluidWaterSurfaceZoneVertex>[] = [];
  const indices: number[] = [];
  const depth = zone.maxZ - zone.minZ;
  const maxWidth = Math.max(zone.startWidthMeters, zone.endWidthMeters);
  const sampleDistance =
    Math.max(
      0.18,
      Math.min(maxWidth / Math.max(1, zone.columns - 1), depth / Math.max(1, zone.rows - 1)) *
        readNumber(input.sampleDistanceScale, 0.78)
    ) / zone.frequencyFloor;

  for (let row = 0; row < zone.rows; row += 1) {
    const v = zone.rows === 1 ? 0 : row / (zone.rows - 1);
    const z = mix(zone.minZ, zone.maxZ, v);
    const width = mix(zone.startWidthMeters, zone.endWidthMeters, v);
    const originX = zone.centerX - width * 0.5;
    const baseHeight = mix(zone.baseHeightStart, zone.baseHeightEnd, v);
    const verticalScale = mix(zone.verticalScaleStart, zone.verticalScaleEnd, v);
    const distanceT = smoothstep(layoutMinZ, layoutMaxZ, z);
    for (let column = 0; column < zone.columns; column += 1) {
      const u = zone.columns === 1 ? 0 : column / (zone.columns - 1);
      const x = originX + width * u;
      const sample = sampleFluidWaterSurface({
        x,
        z,
        time: input.time,
        settings,
        vessels: input.vessels,
        impulses: input.impulses,
      });
      const normal = sampleFluidWaterSurfaceNormal({
        x,
        z,
        time: input.time,
        settings,
        vessels: input.vessels,
        impulses: input.impulses,
        sampleDistance,
        verticalScale,
      });
      const vertex: FluidWaterSurfaceZoneVertex = {
        zoneId: zone.id,
        band: zone.band,
        row,
        column,
        u,
        v,
        distanceT,
        widthMeters: width,
        position: Object.freeze(vec3(x, baseHeight + sample.height * verticalScale, z)),
        normal: normal.normal,
        sample,
      };
      vertices.push(Object.freeze(vertex));
    }
  }

  let skippedCellCount = 0;
  for (let row = 0; row < zone.rows - 1; row += 1) {
    for (let column = 0; column < zone.columns - 1; column += 1) {
      const a = row * zone.columns + column;
      const b = a + 1;
      const c = a + zone.columns + 1;
      const d = a + zone.columns;
      const pointA = vertices[a]!.position;
      const pointB = vertices[b]!.position;
      const pointC = vertices[c]!.position;
      const pointD = vertices[d]!.position;
      const center = scaleVec3(addVec3(addVec3(pointA, pointB), addVec3(pointC, pointD)), 0.25);
      const firstTriangleCenter = scaleVec3(addVec3(addVec3(pointA, pointB), pointC), 1 / 3);
      const secondTriangleCenter = scaleVec3(addVec3(addVec3(pointA, pointC), pointD), 1 / 3);
      if (
        pointInsideExclusions(center, exclusions) ||
        pointInsideExclusions(firstTriangleCenter, exclusions) ||
        pointInsideExclusions(secondTriangleCenter, exclusions)
      ) {
        skippedCellCount += 1;
        continue;
      }
      indices.push(a, b, c, a, c, d);
    }
  }

  const positions = Object.freeze(vertices.map((vertex) => vertex.position));
  const normals = Object.freeze(vertices.map((vertex) => vertex.normal));

  return Object.freeze({
    id: zone.id,
    band: zone.band,
    minZ: zone.minZ,
    maxZ: zone.maxZ,
    startWidthMeters: zone.startWidthMeters,
    endWidthMeters: zone.endWidthMeters,
    rows: zone.rows,
    columns: zone.columns,
    vertices: Object.freeze(vertices),
    positions,
    normals,
    indices: Object.freeze(indices),
    activeCellCount: indices.length / 6,
    skippedCellCount,
    boundaries: Object.freeze({
      minZ: buildZoneBoundary("minZ", zone.minZ, zone.startWidthMeters, 0, zone.columns),
      maxZ: buildZoneBoundary(
        "maxZ",
        zone.maxZ,
        zone.endWidthMeters,
        (zone.rows - 1) * zone.columns,
        zone.columns
      ),
    }),
  });
}

/**
 * Builds a stitched, exclusion-aware large-area water surface from explicit zones.
 */
export function buildFluidWaterSurfaceZoneLayout(
  input: FluidWaterSurfaceZoneLayoutInput
): FluidWaterSurfaceZoneLayout {
  if (!Array.isArray(input.zones) || input.zones.length === 0) {
    throw new TypeError("zones must include at least one water-surface zone.");
  }

  const settings = input.settings ?? createFluidWaterSurfaceSettings(input);
  const zones = input.zones
    .map((zone, index) => normalizeSurfaceZone(zone, index, input.continuity))
    .sort((left, right) => left.minZ - right.minZ);
  const stitching = stitchSurfaceZones(zones, input.stitchingMode);
  const exclusions = freezeExclusions(input.exclusions);
  const layoutMinZ = zones[0]!.minZ;
  const layoutMaxZ = zones[zones.length - 1]!.maxZ;

  return Object.freeze({
    schemaVersion: 1,
    owner: "fluid",
    time: input.time,
    zones: Object.freeze(
      zones.map((zone) =>
        buildFluidWaterSurfaceZoneMesh(zone, input, settings, exclusions, layoutMinZ, layoutMaxZ)
      )
    ),
    stitching,
    exclusions,
  });
}

function createWakePoint(
  center: Required<FluidWaterVector3>,
  width: number,
  turbulence: number
) {
  return Object.freeze({ center: Object.freeze(center), width, turbulence });
}

function createWaterParticle(
  particle: FluidWaterParticle
): Readonly<FluidWaterParticle> {
  return Object.freeze({
    ...particle,
    center: Object.freeze(particle.center),
    velocity: particle.velocity ? Object.freeze(particle.velocity) : undefined,
  });
}

/**
 * Builds renderer-ready wake, foam, and ripple descriptors from shared fluid motion.
 */
export function buildFluidWaterMotionEffects(
  input: FluidWaterMotionEffectsInput
): FluidWaterMotionEffects {
  const settings = input.settings ?? createFluidWaterSurfaceSettings(input);
  const surfaceScale = readNumber(input.surfaceScale, 0.24);
  const wakeTrails: FluidWaterWakeTrail[] = [];
  const foamPatches: FluidWaterFoamPatch[] = [];
  const rippleRings: FluidWaterRippleRing[] = [];
  const particles: Readonly<FluidWaterParticle>[] = [];

  for (const impulse of input.impulses ?? []) {
    const origin = resolveImpulseOrigin(impulse);
    const life = typeof impulse.life === "number" ? impulse.life : Math.exp(-readNumber(impulse.age, 0) * 0.6);
    const radius =
      typeof impulse.life === "number"
        ? readNumber(impulse.radius, 1) + (1 - life) * 4.8
        : readNumber(impulse.age, 0) * readNumber(impulse.radiusGrowth, 4.6);
    rippleRings.push(
      Object.freeze({
        center: Object.freeze(vec3(origin.x, surfaceScale * 0.4, origin.z)),
        radius,
        opacity: clamp(life * 0.4, 0, 0.42),
      })
    );

    const ringFlecks = 18;
    for (let index = 0; index < ringFlecks; index += 1) {
      const noise = pseudoRandom(index * 43 + origin.x * 19 + origin.z * 11);
      if (noise < 0.22) {
        continue;
      }
      const angle = (Math.PI * 2 * index) / ringFlecks + noise * 0.16;
      const x = origin.x + Math.cos(angle) * radius;
      const z = origin.z + Math.sin(angle) * radius;
      const sample = sampleFluidWaterSurface({
        x,
        z,
        time: input.time,
        settings,
        vessels: input.vessels,
        impulses: input.impulses,
      });
      particles.push(
        createWaterParticle({
          kind: "ripple-foam",
          center: vec3(x, sample.height * surfaceScale + 0.058, z),
          radius: 0.035 + noise * 0.055,
          opacity: clamp(life * (0.16 + noise * 0.18), 0, 0.3),
          stretch: 1.4 + noise * 1.6,
          rotation: angle + Math.PI * 0.5,
        })
      );
    }

    const sprayCount = Math.max(3, Math.round(clamp(impulse.strength * 8, 3, 12) * life));
    for (let index = 0; index < sprayCount; index += 1) {
      const noise = pseudoRandom(index * 71 + origin.x * 13 + origin.z * 5);
      const angle = noise * Math.PI * 2;
      const spread = 0.08 + pseudoRandom(index * 83 + origin.z) * 0.28;
      particles.push(
        createWaterParticle({
          kind: "impact-spray",
          center: vec3(
            origin.x + Math.cos(angle) * spread,
            surfaceScale * (0.35 + noise * 1.1),
            origin.z + Math.sin(angle) * spread
          ),
          velocity: vec3(
            Math.cos(angle) * (0.22 + noise * 0.48),
            0.9 + noise * 0.8,
            Math.sin(angle) * (0.18 + noise * 0.38)
          ),
          radius: 0.025 + noise * 0.045,
          opacity: clamp(life * impulse.strength * (0.22 + noise * 0.24), 0, 0.58),
          stretch: 2.1 + noise * 1.8,
          rotation: angle,
        })
      );
    }
  }

  for (const vessel of input.vessels ?? []) {
    const speed = Math.hypot(vessel.velocity.x, vessel.velocity.z);
    if (speed < 0.12) {
      continue;
    }

    const heading = normalizePlanarDirection(vessel.velocity.x, vessel.velocity.z);
    const trailing = scaleVec3(heading, -1);
    const lateral = perpendicularOnWater(heading);
    const wakeLength = readNumber(vessel.wakeLength, settings.wakeLength);
    const wakeStrength = readNumber(vessel.wakeStrength, settings.wakeStrength);
    const stern = addVec3(vessel.position, scaleVec3(heading, -2.6));
    const wakeOpacity = clamp(speed * wakeStrength * 0.2, 0.1, 0.5);
    const centerPoints = [];

    for (let index = 0; index < 14; index += 1) {
      const t = index / 13;
      const along = t * wakeLength;
      const waveOffset = Math.sin(input.time * 2.1 + index * 0.85 + readNumber(vessel.wanderPhase, 0)) * 0.18 * t;
      const center = addVec3(
        stern,
        addVec3(scaleVec3(trailing, along), scaleVec3(lateral, waveOffset))
      );
      const sample = sampleFluidWaterSurface({
        x: center.x,
        z: center.z,
        time: input.time,
        settings,
        vessels: input.vessels,
        impulses: input.impulses,
      });
      centerPoints.push(
        createWakePoint(
          vec3(center.x, sample.height * surfaceScale + 0.045, center.z),
          mix(0.38, 1.9, t),
          0.45 + pseudoRandom(index * 17 + speed * 11) * 0.55
        )
      );
    }

    wakeTrails.push(
      Object.freeze({
        kind: "center",
        opacity: wakeOpacity,
        points: Object.freeze(centerPoints),
      })
    );

    for (const side of [-1, 1] as const) {
      const armPoints = [];
      for (let index = 0; index < 12; index += 1) {
        const t = index / 11;
        const along = t * wakeLength * 0.92;
        const spread = along * 0.42 * side;
        const point = addVec3(
          stern,
          addVec3(scaleVec3(trailing, along), scaleVec3(lateral, spread))
        );
        const sample = sampleFluidWaterSurface({
          x: point.x,
          z: point.z,
          time: input.time,
          settings,
          vessels: input.vessels,
          impulses: input.impulses,
        });
        armPoints.push(
          createWakePoint(
            vec3(point.x, sample.height * surfaceScale + 0.035, point.z),
            mix(0.24, 1.2, t),
            0.35 + pseudoRandom(index * 23 + side * 41 + speed * 7) * 0.45
          )
        );
      }
      wakeTrails.push(
        Object.freeze({
          kind: "kelvin-arm",
          side,
          opacity: wakeOpacity * 0.72,
          points: Object.freeze(armPoints),
        })
      );
    }

    for (let patchIndex = 0; patchIndex < 7; patchIndex += 1) {
      const along = (patchIndex / 6) * wakeLength * 0.42 + 0.7;
      const noise = pseudoRandom(patchIndex * 29 + speed * 13 + readNumber(vessel.wanderPhase, 0));
      const lateralOffset = (noise - 0.5) * mix(0.3, 1.8, patchIndex / 6);
      const worldPoint = addVec3(
        vessel.position,
        addVec3(scaleVec3(trailing, along), scaleVec3(lateral, lateralOffset))
      );
      const sample = sampleFluidWaterSurface({
        x: worldPoint.x,
        z: worldPoint.z,
        time: input.time,
        settings,
        vessels: input.vessels,
        impulses: input.impulses,
      });
      foamPatches.push(
        Object.freeze({
          center: Object.freeze(vec3(worldPoint.x, sample.height * surfaceScale + 0.052, worldPoint.z)),
          majorAxis: Object.freeze(trailing),
          minorAxis: Object.freeze(lateral),
          radiusX: 0.22 + patchIndex * 0.045 + noise * 0.08,
          radiusZ: 0.055 + noise * 0.035,
          opacity: wakeOpacity * (0.54 - patchIndex * 0.038),
        })
      );
    }

    for (let particleIndex = 0; particleIndex < 18; particleIndex += 1) {
      const noise = pseudoRandom(
        particleIndex * 97 + speed * 17 + readNumber(vessel.wanderPhase, 0)
      );
      const t = particleIndex / 17;
      const along = mix(0.8, wakeLength * 0.72, t);
      const lateralOffset =
        (noise - 0.5) * mix(0.45, 2.4, t) +
        Math.sin(input.time * 1.8 + particleIndex) * 0.08;
      const point = addVec3(
        stern,
        addVec3(scaleVec3(trailing, along), scaleVec3(lateral, lateralOffset))
      );
      const sample = sampleFluidWaterSurface({
        x: point.x,
        z: point.z,
        time: input.time,
        settings,
        vessels: input.vessels,
        impulses: input.impulses,
      });
      particles.push(
        createWaterParticle({
          kind: "wake-foam",
          center: vec3(point.x, sample.height * surfaceScale + 0.064, point.z),
          radius: 0.028 + noise * 0.075,
          opacity: wakeOpacity * (0.22 + noise * 0.28) * (1 - t * 0.62),
          stretch: 1.7 + noise * 2.4,
          rotation: Math.atan2(trailing.z, trailing.x) + (noise - 0.5) * 0.8,
        })
      );
    }

    if (speed > 0.55) {
      for (const side of [-1, 1] as const) {
        for (let particleIndex = 0; particleIndex < 5; particleIndex += 1) {
          const noise = pseudoRandom(
            side * 113 + particleIndex * 31 + speed * 41 + readNumber(vessel.wanderPhase, 0)
          );
          const bow = addVec3(
            vessel.position,
            addVec3(
              scaleVec3(heading, 1.35 + noise * 0.7),
              scaleVec3(lateral, side * (0.42 + noise * 0.28))
            )
          );
          const sample = sampleFluidWaterSurface({
            x: bow.x,
            z: bow.z,
            time: input.time,
            settings,
            vessels: input.vessels,
            impulses: input.impulses,
          });
          particles.push(
            createWaterParticle({
              kind: "bow-spray",
              center: vec3(bow.x, sample.height * surfaceScale + 0.11 + noise * 0.12, bow.z),
              velocity: addVec3(
                scaleVec3(heading, 0.42 + speed * 0.08),
                addVec3(scaleVec3(lateral, side * (0.2 + noise * 0.18)), vec3(0, 0.42 + noise * 0.5, 0))
              ),
              radius: 0.025 + noise * 0.052,
              opacity: clamp(wakeOpacity * (0.42 + noise * 0.44), 0, 0.52),
              stretch: 2.2 + noise * 2.6,
              rotation: Math.atan2(heading.z + side * lateral.z * 0.25, heading.x + side * lateral.x * 0.25),
            })
          );
        }
      }
    }
  }

  return Object.freeze({
    wakeTrails: Object.freeze(wakeTrails),
    foamPatches: Object.freeze(foamPatches),
    rippleRings: Object.freeze(rippleRings),
    particles: Object.freeze(particles),
  });
}
