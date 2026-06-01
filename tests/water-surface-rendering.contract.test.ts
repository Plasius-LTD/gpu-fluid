import { describe, expect, it } from "vitest";

import {
  buildFluidWaterSurfaceZoneLayout,
  buildFluidWaterMotionEffects,
  createFluidWaterSurfaceSettings,
  sampleFluidWaterSurface,
  sampleFluidWaterSurfaceNormal,
} from "../src/index.js";

describe("shared water surface rendering contracts", () => {
  it("samples directional waves, vessel wakes, and impulse ripples as separate terms", () => {
    const settings = createFluidWaterSurfaceSettings({
      waveAmplitude: 0.94,
      waveDirection: { x: 0.88, z: 0.28 },
      wavePhaseSpeed: 0.88,
      wakeStrength: 0.31,
      collisionRippleStrength: 0.42,
    });
    const sample = sampleFluidWaterSurface({
      x: -4,
      z: 0.25,
      time: 1.4,
      settings,
      vessels: [
        {
          id: "northwind",
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 2.6, y: 0, z: 0.4 },
        },
      ],
      impulses: [{ x: -3.4, z: 0.2, strength: 0.8, radius: 1.1, life: 0.74 }],
    });

    expect(Math.abs(sample.baseHeight)).toBeGreaterThan(0.01);
    expect(Math.abs(sample.wakeHeight)).toBeGreaterThan(0.01);
    expect(Math.abs(sample.impulseHeight)).toBeGreaterThan(0.001);
    expect(sample.height).toBeCloseTo(
      sample.baseHeight + sample.wakeHeight + sample.impulseHeight,
      8
    );
  });

  it("samples smoothed finite-difference normals for water shading", () => {
    const settings = createFluidWaterSurfaceSettings({
      waveAmplitude: 0.94,
      wakeStrength: 0.31,
    });
    const normal = sampleFluidWaterSurfaceNormal({
      x: -2.4,
      z: 6.8,
      time: 1.25,
      settings,
      sampleDistance: 0.65,
      verticalScale: 0.24,
      vessels: [
        {
          id: "northwind",
          position: { x: 0, y: 0.42, z: 6.2 },
          velocity: { x: 2.35, y: 0, z: -1.05 },
        },
      ],
    });

    expect(normal.normal.y).toBeGreaterThan(0.9);
    expect(Math.hypot(normal.normal.x, normal.normal.y, normal.normal.z)).toBeCloseTo(1, 6);
    expect(normal.slope).toBeGreaterThan(0);
  });

  it("builds patch-based wake and foam descriptors instead of renderer-local line paths", () => {
    const effects = buildFluidWaterMotionEffects({
      time: 2.5,
      wakeStrength: 0.34,
      vessels: [
        {
          id: "northwind",
          position: { x: 0, y: 0.42, z: 6.2 },
          velocity: { x: 2.35, y: 0, z: -1.05 },
          wanderPhase: 0.35,
        },
      ],
      impulses: [{ x: 1.6, z: 7.4, strength: 0.9, radius: 1, life: 0.5 }],
    });

    expect(effects.wakeTrails).toHaveLength(3);
    expect(effects.wakeTrails.find((wake) => wake.kind === "center")?.points.length).toBeGreaterThan(8);
    expect(effects.foamPatches.length).toBeGreaterThanOrEqual(6);
    expect(effects.rippleRings[0]?.radius).toBeGreaterThan(1);
    expect(effects.particles.length).toBeGreaterThan(20);
    expect(new Set(effects.particles.map((particle) => particle.kind))).toEqual(
      new Set(["ripple-foam", "impact-spray", "wake-foam", "bow-spray"])
    );
    expect(effects.wakeTrails.every((wake) => Object.isFrozen(wake.points))).toBe(true);
  });

  it("builds stitched large-area water zones with shared boundaries", () => {
    const layout = buildFluidWaterSurfaceZoneLayout({
      time: 0.5,
      waveAmplitude: 0.8,
      zones: [
        {
          id: "near-harbor",
          band: "near",
          minZ: -6,
          maxZ: 16,
          startWidthMeters: 72,
          endWidthMeters: 56,
          rows: 10,
          columns: 12,
          baseHeightStart: 0.18,
          baseHeightEnd: 0.1,
        },
        {
          id: "mid-channel",
          band: "mid",
          minZ: 16,
          maxZ: 46,
          startWidthMeters: 60,
          endWidthMeters: 76,
          rows: 8,
          columns: 10,
          baseHeightStart: 0.1,
          baseHeightEnd: 0.02,
        },
        {
          id: "far-open-water",
          band: "far",
          minZ: 46,
          maxZ: 100,
          startWidthMeters: 76,
          endWidthMeters: 112,
          rows: 6,
          columns: 8,
          baseHeightStart: 0.02,
          baseHeightEnd: -0.06,
        },
      ],
      continuity: {
        near: { amplitudeFloor: 0.9, frequencyFloor: 1 },
        mid: { amplitudeFloor: 0.56, frequencyFloor: 0.74 },
        far: { amplitudeFloor: 0.28, frequencyFloor: 0.4 },
      },
      exclusions: [
        {
          id: "quay",
          points: [
            { x: -12, z: -3 },
            { x: -12, z: 5 },
            { x: -1, z: 5 },
            { x: -1, z: -3 },
          ],
        },
      ],
    });

    expect(layout.owner).toBe("fluid");
    expect(layout.zones).toHaveLength(3);
    expect(layout.stitching).toHaveLength(2);
    expect(layout.stitching[0]?.widthMeters).toBe(58);
    expect(layout.zones[0]?.endWidthMeters).toBe(layout.zones[1]?.startWidthMeters);
    expect(layout.zones[1]?.endWidthMeters).toBe(layout.zones[2]?.startWidthMeters);
    expect(layout.zones[0]?.maxZ).toBe(layout.zones[1]?.minZ);
    expect(layout.zones[1]?.maxZ).toBe(layout.zones[2]?.minZ);
    expect(layout.zones.every((zone) => zone.activeCellCount > 0)).toBe(true);
    expect(layout.zones[0]?.skippedCellCount).toBeGreaterThan(0);
    expect(
      layout.zones.every((zone) =>
        zone.vertices.every((vertex) =>
          Number.isFinite(vertex.position.y) &&
          Number.isFinite(vertex.normal.x) &&
          Number.isFinite(vertex.normal.y) &&
          Number.isFinite(vertex.normal.z)
        )
      )
    ).toBe(true);
    expect(Object.isFrozen(layout.zones[0]?.vertices)).toBe(true);
  });

  it("rejects large-area water zones that overlap or leave unstitched gaps", () => {
    expect(() =>
      buildFluidWaterSurfaceZoneLayout({
        time: 0,
        zones: [
          { band: "near", minZ: 0, maxZ: 12, startWidthMeters: 10, endWidthMeters: 12 },
          { band: "mid", minZ: 11, maxZ: 20, startWidthMeters: 12, endWidthMeters: 18 },
        ],
      })
    ).toThrow(/overlaps/u);

    expect(() =>
      buildFluidWaterSurfaceZoneLayout({
        time: 0,
        zones: [
          { band: "near", minZ: 0, maxZ: 12, startWidthMeters: 10, endWidthMeters: 12 },
          { band: "mid", minZ: 14, maxZ: 20, startWidthMeters: 12, endWidthMeters: 18 },
        ],
      })
    ).toThrow(/unstitched z gap/u);
  });
});
