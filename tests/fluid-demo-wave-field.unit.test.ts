import { describe, expect, it } from "vitest";

import {
  createFluidWaveImpulse,
  createWaveFieldSettings,
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
});
