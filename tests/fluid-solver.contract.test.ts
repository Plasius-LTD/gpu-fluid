import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createFluidBoundaryField,
  createFluidRenderMaterialDescriptor,
  createFluidSimulationChunkKey,
  createFluidSimulationRenderSnapshot,
  createFluidVoxelVolume,
  extractFluidFreeSurface,
  fluidCellIndex,
  stepFluidSimulation,
} from "../src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));

describe("voxel fluid solver", () => {
  it("conserves mass when no sources or sinks are applied", () => {
    const volume = createFluidVoxelVolume({
      chunkKey: createFluidSimulationChunkKey("lake", 0, 0, 0),
      sizeX: 2,
      sizeY: 2,
      sizeZ: 1,
      initialVolumeFraction: (x, y) => (x === 0 && y === 1 ? 0.9 : 0),
    });

    const result = stepFluidSimulation(volume, { dt: 1 / 30 });

    expect(result.step.massAfter).toBeCloseTo(result.step.massBefore, 6);
    expect(result.step.changedCellCount).toBeGreaterThan(0);
  });

  it("reduces velocity divergence during pressure projection", () => {
    const volume = createFluidVoxelVolume({
      chunkKey: createFluidSimulationChunkKey("river", 0, 0, 0),
      sizeX: 3,
      sizeY: 1,
      sizeZ: 1,
      initialVolumeFraction: 0.6,
    });
    volume.velocity[fluidCellIndex(3, 1, 0, 0, 0) * 3] = -3;
    volume.velocity[fluidCellIndex(3, 1, 2, 0, 0) * 3] = 3;

    const result = stepFluidSimulation(volume, {
      dt: 1 / 60,
      gravity: 0,
      pressureIterations: 4,
    });

    expect(result.step.maxDivergenceAfter).toBeLessThan(
      result.step.maxDivergenceBefore
    );
  });

  it("blocks flow through solid voxel boundaries", () => {
    const chunkKey = createFluidSimulationChunkKey("shaft", 0, 0, 0);
    const volume = createFluidVoxelVolume({
      chunkKey,
      sizeX: 1,
      sizeY: 2,
      sizeZ: 1,
      initialVolumeFraction: (_x, y) => (y === 1 ? 1 : 0),
    });
    const boundary = createFluidBoundaryField({
      chunkKey,
      sizeX: 1,
      sizeY: 2,
      sizeZ: 1,
      solid: (_x, y) => y === 0,
    });

    const result = stepFluidSimulation(volume, {
      boundary,
      dt: 1 / 20,
      gravity: -9.81,
    });

    expect(result.volume.volumeFraction[fluidCellIndex(1, 2, 0, 0, 0)]).toBe(0);
    expect(result.volume.volumeFraction[fluidCellIndex(1, 2, 0, 1, 0)]).toBe(1);
  });

  it("applies sources and sinks as bounded volume changes", () => {
    const chunkKey = createFluidSimulationChunkKey("volcano", 0, 0, 0);
    const empty = createFluidVoxelVolume({
      chunkKey,
      sizeX: 3,
      sizeY: 3,
      sizeZ: 3,
      material: "lava",
    });

    const filled = stepFluidSimulation(empty, {
      dt: 1,
      gravity: 0,
      sources: [
        {
          id: "lava-source",
          kind: "source",
          material: "lava",
          center: [1.5, 1.5, 1.5],
          radius: 2,
          rate: 0.5,
          temperatureKelvin: 1250,
        },
      ],
    });
    const drained = stepFluidSimulation(filled.volume, {
      dt: 1,
      gravity: 0,
      sources: [
        {
          id: "lava-sink",
          kind: "sink",
          material: "lava",
          center: [1.5, 1.5, 1.5],
          radius: 2,
          rate: 0.25,
        },
      ],
    });

    expect(filled.step.massAfter).toBeGreaterThan(empty.volumeFraction[0] ?? 0);
    expect(drained.step.massAfter).toBeLessThan(filled.step.massAfter);
  });

  it("uses world-space sources so adjacent chunks receive continuous boundary fluid", () => {
    const left = createFluidVoxelVolume({
      chunkKey: createFluidSimulationChunkKey("river", 0, 0, 0),
      sizeX: 4,
      sizeY: 2,
      sizeZ: 1,
    });
    const right = createFluidVoxelVolume({
      chunkKey: createFluidSimulationChunkKey("river", 1, 0, 0),
      sizeX: 4,
      sizeY: 2,
      sizeZ: 1,
    });
    const sharedSource = {
      id: "boundary-source",
      kind: "source" as const,
      material: "water" as const,
      center: [4, 0.5, 0.5] as const,
      radius: 1.1,
      rate: 0.5,
    };

    const leftStep = stepFluidSimulation(left, {
      dt: 1,
      gravity: 0,
      sources: [sharedSource],
    });
    const rightStep = stepFluidSimulation(right, {
      dt: 1,
      gravity: 0,
      sources: [sharedSource],
    });

    const leftBoundary = leftStep.volume.volumeFraction[fluidCellIndex(4, 2, 3, 0, 0)];
    const rightBoundary = rightStep.volume.volumeFraction[fluidCellIndex(4, 2, 0, 0, 0)];

    expect(leftBoundary).toBeCloseTo(rightBoundary ?? 0, 6);
    expect(leftBoundary).toBeGreaterThan(0);
  });

  it("extracts valid free-surface and render snapshot payloads", () => {
    const volume = createFluidVoxelVolume({
      chunkKey: createFluidSimulationChunkKey("pool", 0, 0, 0),
      sizeX: 2,
      sizeY: 2,
      sizeZ: 2,
      initialVolumeFraction: (_x, y) => (y === 0 ? 0.75 : 0),
    });

    const surface = extractFluidFreeSurface(volume);
    const snapshot = createFluidSimulationRenderSnapshot(volume);

    expect(surface.positions.length).toBeGreaterThan(0);
    expect(surface.indices.length % 3).toBe(0);
    expect(surface.normals.length).toBe(surface.positions.length);
    expect(snapshot.freeSurface.material).toBe("water");
  });

  it("exposes physically distinct material descriptors", () => {
    const water = createFluidRenderMaterialDescriptor("water");
    const lava = createFluidRenderMaterialDescriptor("lava");

    expect(water.shadingModel).toBe("water");
    expect(water.transmission).toBeGreaterThan(lava.transmission);
    expect(lava.emissive[0]).toBeGreaterThan(1);
  });
});

describe("fluid WGSL solver asset", () => {
  it("contains V1 GPU solver stages", () => {
    const wgsl = readFileSync(
      resolve(testDir, "../src/fluid-solver.wgsl"),
      "utf8"
    );

    expect(wgsl).toContain("fn volume_advection");
    expect(wgsl).toContain("fn pressure_projection");
    expect(wgsl).toContain("fn boundary_coupling");
    expect(wgsl).toContain("fn free_surface_extraction");
    expect(wgsl).toContain("fn surface_band_update");
    expect(wgsl).toContain("fn foam_spray_mask");
  });
});
