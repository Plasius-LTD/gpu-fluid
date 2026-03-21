import { describe, expect, it } from "vitest";

import {
  computeShipFloatOffset,
  buildHeightFieldNormals,
  createFluidWaveImpulse,
  createWaveFieldSettings,
  reflectPointAcrossPlane,
  sampleDirectionalWaveField,
  sampleFluidCollisionField,
  sampleFluidSurfaceHeight,
} from "../demo/harbor-runtime.js";

describe("fluid demo wave field", () => {
  it("advects the shared wave field along a travel direction instead of oscillating in place", () => {
    const settings = createWaveFieldSettings({
      waveDirection: { x: 1, z: 0 },
      wavePhaseSpeed: 1.15,
    });
    const x = 1.7;
    const z = -0.8;
    const time = 3.4;
    const dt = 0.2;
    const amplitude = 0.9;

    const start = sampleDirectionalWaveField(x, z, time, amplitude, settings);
    const advected = sampleDirectionalWaveField(
      x + settings.primaryDirection.x * settings.driftMetersPerSecond * dt,
      z + settings.primaryDirection.z * settings.driftMetersPerSecond * dt,
      time + dt,
      amplitude,
      settings
    );
    const stationary = sampleDirectionalWaveField(
      x,
      z,
      time + dt,
      amplitude,
      settings
    );

    expect(Math.abs(advected - start)).toBeLessThan(Math.abs(stationary - start));
  });

  it("adds wake displacement behind moving ships", () => {
    const visuals = {
      waveAmplitude: 0.72,
      waveDirection: { x: 0.94, z: 0.34 },
      wavePhaseSpeed: 1.18,
      wakeStrength: 0.32,
    };
    const settings = createWaveFieldSettings(visuals);
    const state = {
      time: 1.2,
      ships: [
        {
          id: "northwind",
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 2.6, y: 0, z: 0.4 },
        },
      ],
      waveImpulses: [],
    };

    const wakePoint = sampleFluidSurfaceHeight(state, visuals, -4, 0.25, {
      settings,
    });
    const wakeBase = sampleDirectionalWaveField(-4, 0.25, state.time, visuals.waveAmplitude, settings);
    const farPoint = sampleFluidSurfaceHeight(state, visuals, -24, 9.5, {
      settings,
    });
    const farBase = sampleDirectionalWaveField(-24, 9.5, state.time, visuals.waveAmplitude, settings);

    expect(Math.abs(wakePoint - wakeBase)).toBeGreaterThan(0.015);
    expect(Math.abs(wakePoint - wakeBase)).toBeGreaterThan(
      Math.abs(farPoint - farBase)
    );
  });

  it("propagates collision ripples out from the impact point", () => {
    const settings = createWaveFieldSettings();
    const state = {
      waveImpulses: [
        createFluidWaveImpulse({ x: 0, z: 0 }, 0.6, {
          age: 0.6,
          radiusGrowth: 4.6,
        }),
      ],
    };

    const nearFront = sampleFluidCollisionField(state, 2.5, 0.1, settings);
    const farAway = sampleFluidCollisionField(state, 18, 0, settings);

    expect(Math.abs(nearFront)).toBeGreaterThan(Math.abs(farAway));
  });

  it("uses smoothed heightfield normals so wave shading is less faceted than raw face normals", () => {
    const rows = 3;
    const cols = 3;
    const positions = [
      { x: -1, y: 0, z: -1 },
      { x: 0, y: 0.15, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: -1, y: 0.1, z: 0 },
      { x: 0, y: 0.65, z: 0 },
      { x: 1, y: 0.12, z: 0 },
      { x: -1, y: 0, z: 1 },
      { x: 0, y: 0.14, z: 1 },
      { x: 1, y: 0, z: 1 },
    ];

    const cross = (a, b) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    });
    const sub = (a, b) => ({
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z,
    });
    const normalize = (vector) => {
      const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
      return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length,
      };
    };

    const faceNormal = normalize(
      cross(sub(positions[4], positions[3]), sub(positions[7], positions[3]))
    );
    const normals = buildHeightFieldNormals(positions, rows, cols);
    const blendedNormal = normalize({
      x: normals[3].x + normals[4].x + normals[7].x,
      y: normals[3].y + normals[4].y + normals[7].y,
      z: normals[3].z + normals[4].z + normals[7].z,
    });

    expect(blendedNormal.y).toBeGreaterThan(faceNormal.y);
    expect(blendedNormal.y).toBeGreaterThan(0.8);
    expect(
      normals[4].x * normals[7].x +
        normals[4].y * normals[7].y +
        normals[4].z * normals[7].z
    ).toBeGreaterThan(0.9);
  });

  it("reflects scene points back across the sampled water plane", () => {
    const original = { x: 3.4, y: 2.2, z: -1.7 };
    const reflected = reflectPointAcrossPlane(original, 0.6, 0.1);

    expect(reflected.x).toBe(original.x);
    expect(reflected.z).toBe(original.z);
    expect(reflected.y).toBeCloseTo(-1.1, 6);
  });

  it("keeps the ship hull riding above the water surface instead of sinking through it", () => {
    const bounds = {
      min: [-1.35, -0.5, -3.2],
      max: [1.35, 0.95, 4.1],
    };
    const offset = computeShipFloatOffset(bounds, {}, 1.1);
    const keelDepth = offset + bounds.min[1] * 1.1;
    const deckHeight = offset + bounds.max[1] * 1.1;

    expect(keelDepth).toBeLessThan(-0.05);
    expect(keelDepth).toBeGreaterThan(-0.28);
    expect(deckHeight).toBeGreaterThan(1.2);
  });
});
