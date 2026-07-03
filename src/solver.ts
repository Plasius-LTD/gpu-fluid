import type {
  FluidBoundaryField,
  FluidFreeSurfaceMesh,
  FluidMaterialKind,
  FluidSimulationChunkKey,
  FluidSimulationRenderSnapshot,
  FluidSimulationStep,
  FluidSimulationStepResult,
  FluidSourceSink,
  FluidSurfaceMaterialDescriptor,
  FluidVoxelVolume,
} from "./types.js";

export interface CreateFluidVoxelVolumeOptions {
  chunkKey: FluidSimulationChunkKey;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxelSize?: number;
  material?: FluidMaterialKind;
  initialVolumeFraction?:
    | number
    | ((x: number, y: number, z: number) => number);
  initialTemperatureKelvin?: number;
}

export interface CreateFluidBoundaryFieldOptions {
  chunkKey: FluidSimulationChunkKey;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxelSize?: number;
  solid?: Uint8Array | ((x: number, y: number, z: number) => boolean);
  openBoundaryMask?: number;
}

export interface StepFluidSimulationOptions {
  boundary?: FluidBoundaryField | null;
  sources?: readonly FluidSourceSink[];
  dt?: number;
  gravity?: number;
  pressureIterations?: number;
  viscosity?: number;
}

export interface ExtractFluidFreeSurfaceOptions {
  boundary?: FluidBoundaryField | null;
  threshold?: number;
  materialId?: string;
}

const DEFAULT_VOXEL_SIZE = 1;
const DEFAULT_TEMPERATURE: Readonly<Record<FluidMaterialKind, number>> =
  Object.freeze({
    water: 288,
    lava: 1250,
    sludge: 295,
  });

const DEFAULT_VISCOSITY: Readonly<Record<FluidMaterialKind, number>> =
  Object.freeze({
    water: 0.08,
    lava: 0.62,
    sludge: 0.36,
  });

const MATERIAL_COLOR: Readonly<Record<FluidMaterialKind, readonly [number, number, number, number]>> =
  Object.freeze({
    water: Object.freeze([0.06, 0.28, 0.44, 0.86] as const),
    lava: Object.freeze([1, 0.28, 0.04, 0.92] as const),
    sludge: Object.freeze([0.22, 0.28, 0.12, 0.88] as const),
  });

const MATERIAL_ABSORPTION: Readonly<Record<FluidMaterialKind, readonly [number, number, number]>> =
  Object.freeze({
    water: Object.freeze([0.12, 0.05, 0.02] as const),
    lava: Object.freeze([0.04, 0.34, 0.65] as const),
    sludge: Object.freeze([0.24, 0.18, 0.08] as const),
  });

function assertPositiveInteger(label: string, value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return value;
}

function assertFinitePositive(label: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number`);
  }

  return value;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function readFloat32(values: Float32Array, index: number): number {
  return values[index] ?? 0;
}

function readUint8(values: Uint8Array, index: number): number {
  return values[index] ?? 0;
}

export function fluidCellIndex(
  sizeX: number,
  sizeY: number,
  x: number,
  y: number,
  z: number
): number {
  return x + sizeX * (y + sizeY * z);
}

function velocityIndex(cellIndex: number): number {
  return cellIndex * 3;
}

function cloneChunkKey(
  chunkKey: FluidSimulationChunkKey
): Readonly<FluidSimulationChunkKey> {
  return Object.freeze({
    fluidBodyId: chunkKey.fluidBodyId,
    cx: chunkKey.cx,
    cy: chunkKey.cy,
    cz: chunkKey.cz,
  });
}

function createVolumeLike(
  source: FluidVoxelVolume,
  volumeFraction = new Float32Array(source.volumeFraction),
  pressure = new Float32Array(source.pressure),
  velocity = new Float32Array(source.velocity),
  temperatureKelvin = new Float32Array(source.temperatureKelvin),
  foam = new Float32Array(source.foam)
): FluidVoxelVolume {
  return {
    schemaVersion: 1,
    owner: "fluid",
    chunkKey: cloneChunkKey(source.chunkKey),
    sizeX: source.sizeX,
    sizeY: source.sizeY,
    sizeZ: source.sizeZ,
    voxelSize: source.voxelSize,
    material: source.material,
    volumeFraction,
    pressure,
    velocity,
    temperatureKelvin,
    foam,
  };
}

function isSolid(
  boundary: FluidBoundaryField | null | undefined,
  x: number,
  y: number,
  z: number
): boolean {
  if (!boundary) {
    return false;
  }

  if (
    x < 0 ||
    y < 0 ||
    z < 0 ||
    x >= boundary.sizeX ||
    y >= boundary.sizeY ||
    z >= boundary.sizeZ
  ) {
    return true;
  }

  return readUint8(boundary.solid, fluidCellIndex(boundary.sizeX, boundary.sizeY, x, y, z)) > 0;
}

function sumMass(volumeFraction: Float32Array): number {
  let mass = 0;
  for (const value of volumeFraction) {
    mass += value;
  }
  return mass;
}

function maxVelocityDivergence(volume: FluidVoxelVolume, velocity: Float32Array): number {
  let maxDivergence = 0;

  for (let z = 0; z < volume.sizeZ; z += 1) {
    for (let y = 0; y < volume.sizeY; y += 1) {
      for (let x = 0; x < volume.sizeX; x += 1) {
        const center = fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z);
        const left = x > 0 ? fluidCellIndex(volume.sizeX, volume.sizeY, x - 1, y, z) : center;
        const right = x + 1 < volume.sizeX ? fluidCellIndex(volume.sizeX, volume.sizeY, x + 1, y, z) : center;
        const down = y > 0 ? fluidCellIndex(volume.sizeX, volume.sizeY, x, y - 1, z) : center;
        const up = y + 1 < volume.sizeY ? fluidCellIndex(volume.sizeX, volume.sizeY, x, y + 1, z) : center;
        const back = z > 0 ? fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z - 1) : center;
        const front = z + 1 < volume.sizeZ ? fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z + 1) : center;
        const divergence =
          (readFloat32(velocity, velocityIndex(right)) - readFloat32(velocity, velocityIndex(left)) +
            readFloat32(velocity, velocityIndex(up) + 1) - readFloat32(velocity, velocityIndex(down) + 1) +
            readFloat32(velocity, velocityIndex(front) + 2) - readFloat32(velocity, velocityIndex(back) + 2)) /
          (2 * volume.voxelSize);

        maxDivergence = Math.max(maxDivergence, Math.abs(divergence));
      }
    }
  }

  return maxDivergence;
}

function applySourcesAndSinks(
  volume: FluidVoxelVolume,
  sources: readonly FluidSourceSink[],
  dt: number
): void {
  if (sources.length === 0) {
    return;
  }

  for (const source of sources) {
    const radius = assertFinitePositive("source.radius", source.radius);
    const signedRate = source.kind === "source" ? Math.abs(source.rate) : -Math.abs(source.rate);
    const temperature =
      source.temperatureKelvin ?? DEFAULT_TEMPERATURE[source.material];

    for (let z = 0; z < volume.sizeZ; z += 1) {
      for (let y = 0; y < volume.sizeY; y += 1) {
        for (let x = 0; x < volume.sizeX; x += 1) {
          const worldX = (volume.chunkKey.cx * volume.sizeX + x + 0.5) * volume.voxelSize;
          const worldY = (volume.chunkKey.cy * volume.sizeY + y + 0.5) * volume.voxelSize;
          const worldZ = (volume.chunkKey.cz * volume.sizeZ + z + 0.5) * volume.voxelSize;
          const distance = Math.hypot(
            worldX - source.center[0],
            worldY - source.center[1],
            worldZ - source.center[2]
          );

          if (distance > radius) {
            continue;
          }

          const falloff = 1 - distance / radius;
          const index = fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z);
          volume.volumeFraction[index] = clamp01(
            readFloat32(volume.volumeFraction, index) + signedRate * dt * falloff
          );
          volume.temperatureKelvin[index] = temperature;
        }
      }
    }
  }
}

function pressureProject(volume: FluidVoxelVolume, iterations: number): void {
  const pressure = volume.pressure;
  const next = new Float32Array(pressure.length);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let z = 0; z < volume.sizeZ; z += 1) {
      for (let y = 0; y < volume.sizeY; y += 1) {
        for (let x = 0; x < volume.sizeX; x += 1) {
          const index = fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z);
          let total = readFloat32(volume.volumeFraction, index);
          let count = 1;

          const neighbors = [
            [x - 1, y, z],
            [x + 1, y, z],
            [x, y - 1, z],
            [x, y + 1, z],
            [x, y, z - 1],
            [x, y, z + 1],
          ] as const;

          for (const [nx, ny, nz] of neighbors) {
            if (
              nx >= 0 &&
              ny >= 0 &&
              nz >= 0 &&
              nx < volume.sizeX &&
              ny < volume.sizeY &&
              nz < volume.sizeZ
            ) {
              total += readFloat32(
                pressure,
                fluidCellIndex(volume.sizeX, volume.sizeY, nx, ny, nz)
              );
              count += 1;
            }
          }

          next[index] = total / count;
        }
      }
    }

    pressure.set(next);
  }
}

function advectVolume(volume: FluidVoxelVolume, boundary: FluidBoundaryField | null | undefined): Float32Array {
  const next = new Float32Array(volume.volumeFraction);
  const delta = new Float32Array(volume.volumeFraction.length);
  const viscosity = DEFAULT_VISCOSITY[volume.material];

  for (let z = 0; z < volume.sizeZ; z += 1) {
    for (let y = 0; y < volume.sizeY; y += 1) {
      for (let x = 0; x < volume.sizeX; x += 1) {
        const index = fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z);
        const amount = readFloat32(volume.volumeFraction, index);

        if (amount <= 0.0001 || isSolid(boundary, x, y, z)) {
          continue;
        }

        const below = [x, y - 1, z] as const;
        const lateral = [
          [x - 1, y, z],
          [x + 1, y, z],
          [x, y, z - 1],
          [x, y, z + 1],
        ] as const;

        if (below[1] >= 0 && !isSolid(boundary, below[0], below[1], below[2])) {
          const belowIndex = fluidCellIndex(volume.sizeX, volume.sizeY, below[0], below[1], below[2]);
          const capacity = Math.max(
            0,
            1 - readFloat32(volume.volumeFraction, belowIndex) - readFloat32(delta, belowIndex)
          );
          const transfer = Math.min(amount * (0.5 - viscosity * 0.25), capacity);
          delta[index] = readFloat32(delta, index) - transfer;
          delta[belowIndex] = readFloat32(delta, belowIndex) + transfer;
        }

        if (amount > 0.55) {
          const spill = Math.min((amount - 0.55) * (0.18 - viscosity * 0.08), amount * 0.12);
          const open = lateral.filter(([nx, ny, nz]) =>
            nx >= 0 &&
            nz >= 0 &&
            nx < volume.sizeX &&
            nz < volume.sizeZ &&
            !isSolid(boundary, nx, ny, nz)
          );

          if (open.length > 0) {
            const perNeighbor = spill / open.length;
            for (const [nx, ny, nz] of open) {
              const neighborIndex = fluidCellIndex(volume.sizeX, volume.sizeY, nx, ny, nz);
              const capacity = Math.max(
                0,
                1 - readFloat32(volume.volumeFraction, neighborIndex) - readFloat32(delta, neighborIndex)
              );
              const transfer = Math.min(perNeighbor, capacity);
              delta[index] = readFloat32(delta, index) - transfer;
              delta[neighborIndex] = readFloat32(delta, neighborIndex) + transfer;
            }
          }
        }
      }
    }
  }

  for (let index = 0; index < next.length; index += 1) {
    next[index] = clamp01(readFloat32(next, index) + readFloat32(delta, index));
  }

  return next;
}

/**
 * Creates a chunk key for a chunked fluid simulation.
 */
export function createFluidSimulationChunkKey(
  fluidBodyId: string,
  cx = 0,
  cy = 0,
  cz = 0
): FluidSimulationChunkKey {
  if (fluidBodyId.trim().length === 0) {
    throw new Error("fluidBodyId is required");
  }

  return { fluidBodyId, cx, cy, cz };
}

/**
 * Creates a deterministic voxel fluid volume for near-field simulation.
 */
export function createFluidVoxelVolume(
  options: CreateFluidVoxelVolumeOptions
): FluidVoxelVolume {
  const sizeX = assertPositiveInteger("sizeX", options.sizeX);
  const sizeY = assertPositiveInteger("sizeY", options.sizeY);
  const sizeZ = assertPositiveInteger("sizeZ", options.sizeZ);
  const voxelSize = assertFinitePositive(
    "voxelSize",
    options.voxelSize ?? DEFAULT_VOXEL_SIZE
  );
  const material = options.material ?? "water";
  const cellCount = sizeX * sizeY * sizeZ;
  const volumeFraction = new Float32Array(cellCount);
  const pressure = new Float32Array(cellCount);
  const velocity = new Float32Array(cellCount * 3);
  const temperatureKelvin = new Float32Array(cellCount);
  const foam = new Float32Array(cellCount);

  for (let z = 0; z < sizeZ; z += 1) {
    for (let y = 0; y < sizeY; y += 1) {
      for (let x = 0; x < sizeX; x += 1) {
        const index = fluidCellIndex(sizeX, sizeY, x, y, z);
        volumeFraction[index] = clamp01(
          typeof options.initialVolumeFraction === "function"
            ? options.initialVolumeFraction(x, y, z)
            : options.initialVolumeFraction ?? 0
        );
        pressure[index] = volumeFraction[index];
        temperatureKelvin[index] =
          options.initialTemperatureKelvin ?? DEFAULT_TEMPERATURE[material];
      }
    }
  }

  return {
    schemaVersion: 1,
    owner: "fluid",
    chunkKey: cloneChunkKey(options.chunkKey),
    sizeX,
    sizeY,
    sizeZ,
    voxelSize,
    material,
    volumeFraction,
    pressure,
    velocity,
    temperatureKelvin,
    foam,
  };
}

/**
 * Creates solid/open constraints for a fluid volume.
 */
export function createFluidBoundaryField(
  options: CreateFluidBoundaryFieldOptions
): FluidBoundaryField {
  const sizeX = assertPositiveInteger("sizeX", options.sizeX);
  const sizeY = assertPositiveInteger("sizeY", options.sizeY);
  const sizeZ = assertPositiveInteger("sizeZ", options.sizeZ);
  const voxelSize = assertFinitePositive(
    "voxelSize",
    options.voxelSize ?? DEFAULT_VOXEL_SIZE
  );
  const cellCount = sizeX * sizeY * sizeZ;
  const solid = new Uint8Array(cellCount);

  if (options.solid instanceof Uint8Array) {
    if (options.solid.length !== cellCount) {
      throw new Error("solid field length must match fluid dimensions");
    }
    solid.set(options.solid);
  } else if (typeof options.solid === "function") {
    for (let z = 0; z < sizeZ; z += 1) {
      for (let y = 0; y < sizeY; y += 1) {
        for (let x = 0; x < sizeX; x += 1) {
          solid[fluidCellIndex(sizeX, sizeY, x, y, z)] = options.solid(x, y, z) ? 1 : 0;
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    owner: "fluid",
    chunkKey: cloneChunkKey(options.chunkKey),
    sizeX,
    sizeY,
    sizeZ,
    voxelSize,
    solid,
    openBoundaryMask: options.openBoundaryMask ?? 0b111111,
  };
}

/**
 * Advances a fluid volume one deterministic V1 step.
 */
export function stepFluidSimulation(
  volume: FluidVoxelVolume,
  options: StepFluidSimulationOptions = {}
): FluidSimulationStepResult {
  const dt = assertFinitePositive("dt", options.dt ?? 1 / 30);
  const pressureIterations = Math.max(1, Math.floor(options.pressureIterations ?? 4));
  const boundary = options.boundary ?? null;
  const gravity = options.gravity ?? -9.81;
  const next = createVolumeLike(volume);
  const massBefore = sumMass(next.volumeFraction);
  const maxDivergenceBefore = maxVelocityDivergence(next, next.velocity);

  applySourcesAndSinks(next, options.sources ?? [], dt);

  for (let index = 0; index < next.volumeFraction.length; index += 1) {
    const amount = readFloat32(next.volumeFraction, index);
    if (amount <= 0 || amount >= 1) {
      continue;
    }
    next.velocity[velocityIndex(index) + 1] =
      readFloat32(next.velocity, velocityIndex(index) + 1) + gravity * dt * amount;
  }

  next.volumeFraction = advectVolume(next, boundary);
  pressureProject(next, pressureIterations);

  const damping = 1 - Math.min(0.95, options.viscosity ?? DEFAULT_VISCOSITY[next.material]);
  for (let index = 0; index < next.velocity.length; index += 1) {
    next.velocity[index] = readFloat32(next.velocity, index) * damping;
  }

  let changedCellCount = 0;
  for (let index = 0; index < next.volumeFraction.length; index += 1) {
    const changed =
      Math.abs(
        readFloat32(next.volumeFraction, index) -
          readFloat32(volume.volumeFraction, index)
      ) > 0.00001;
    if (changed) {
      changedCellCount += 1;
    }
    next.foam[index] = Math.max(
      0,
      Math.min(
        1,
        Math.abs(readFloat32(next.velocity, velocityIndex(index) + 1)) * 0.12 +
          readFloat32(next.foam, index) * 0.8
      )
    );
  }

  const step: FluidSimulationStep = {
    schemaVersion: 1,
    owner: "fluid",
    chunkKey: cloneChunkKey(next.chunkKey),
    dt,
    material: next.material,
    massBefore,
    massAfter: sumMass(next.volumeFraction),
    maxDivergenceBefore,
    maxDivergenceAfter: maxVelocityDivergence(next, next.velocity),
    changedCellCount,
  };

  return { volume: next, step: Object.freeze(step) };
}

/**
 * Extracts a top/free-surface mesh from the simulated volume.
 */
export function extractFluidFreeSurface(
  volume: FluidVoxelVolume,
  options: ExtractFluidFreeSurfaceOptions = {}
): FluidFreeSurfaceMesh {
  const threshold = options.threshold ?? 0.04;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const foam: number[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  function pushVertex(x: number, y: number, z: number, foamAmount: number): number {
    const index = positions.length / 3;
    positions.push(x, y, z);
    normals.push(0, 1, 0);
    foam.push(foamAmount);
    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    min[2] = Math.min(min[2], z);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
    max[2] = Math.max(max[2], z);
    return index;
  }

  for (let z = 0; z < volume.sizeZ; z += 1) {
    for (let y = 0; y < volume.sizeY; y += 1) {
      for (let x = 0; x < volume.sizeX; x += 1) {
        const index = fluidCellIndex(volume.sizeX, volume.sizeY, x, y, z);
        const amount = readFloat32(volume.volumeFraction, index);
        const aboveSolid = isSolid(options.boundary, x, y + 1, z);
        const aboveIndex =
          y + 1 < volume.sizeY
            ? fluidCellIndex(volume.sizeX, volume.sizeY, x, y + 1, z)
            : -1;
        const aboveAmount = aboveIndex >= 0 ? readFloat32(volume.volumeFraction, aboveIndex) : 0;

        if (amount <= threshold || aboveAmount > threshold || aboveSolid) {
          continue;
        }

        const baseX = (volume.chunkKey.cx * volume.sizeX + x) * volume.voxelSize;
        const baseY =
          (volume.chunkKey.cy * volume.sizeY + y + Math.max(0.08, amount)) *
          volume.voxelSize;
        const baseZ = (volume.chunkKey.cz * volume.sizeZ + z) * volume.voxelSize;
        const s = volume.voxelSize;
        const foamAmount = readFloat32(volume.foam, index);
        const a = pushVertex(baseX, baseY, baseZ, foamAmount);
        const b = pushVertex(baseX + s, baseY, baseZ, foamAmount);
        const c = pushVertex(baseX + s, baseY, baseZ + s, foamAmount);
        const d = pushVertex(baseX, baseY, baseZ + s, foamAmount);
        indices.push(a, b, c, a, c, d);
      }
    }
  }

  const empty = positions.length === 0;

  return {
    schemaVersion: 1,
    owner: "fluid",
    chunkKey: cloneChunkKey(volume.chunkKey),
    material: volume.material,
    materialId: options.materialId ?? `fluid.${volume.material}`,
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
    foam: Float32Array.from(foam),
    bounds: Object.freeze({
      min: Object.freeze((empty ? [0, 0, 0] : min) as [number, number, number]),
      max: Object.freeze((empty ? [0, 0, 0] : max) as [number, number, number]),
    }),
  };
}

/**
 * Creates a render snapshot from simulated volume state.
 */
export function createFluidSimulationRenderSnapshot(
  volume: FluidVoxelVolume,
  step: FluidSimulationStep | null = null,
  options: ExtractFluidFreeSurfaceOptions = {}
): FluidSimulationRenderSnapshot {
  return {
    schemaVersion: 1,
    owner: "fluid",
    chunkKey: cloneChunkKey(volume.chunkKey),
    material: volume.material,
    volume,
    freeSurface: extractFluidFreeSurface(volume, options),
    step,
  };
}

/**
 * Returns a physically shaded fluid material profile for renderer integration.
 */
export function createFluidRenderMaterialDescriptor(
  material: FluidMaterialKind,
  id = `fluid.${material}`
): FluidSurfaceMaterialDescriptor {
  return Object.freeze({
    id,
    shadingModel: material,
    baseColor: Object.freeze(MATERIAL_COLOR[material]),
    roughness: material === "water" ? 0.018 : material === "lava" ? 0.36 : 0.22,
    metallic: 0,
    opacity: material === "water" ? 0.82 : 0.95,
    ior: material === "water" ? 1.333 : material === "lava" ? 1.48 : 1.39,
    transmission: material === "water" ? 0.9 : material === "lava" ? 0.08 : 0.22,
    specular: material === "water" ? 0.92 : 0.45,
    emissive: Object.freeze(material === "lava" ? [1.6, 0.38, 0.04] : [0, 0, 0]),
    absorption: Object.freeze(MATERIAL_ABSORPTION[material]),
    caustics: material === "water",
    foam: material !== "lava",
    foamAmount: material === "water" ? 0.55 : material === "sludge" ? 0.18 : 0,
    normalTexture: null,
    heightTexture: null,
    foamTexture: null,
    mediumId: `${id}.medium`,
  });
}
