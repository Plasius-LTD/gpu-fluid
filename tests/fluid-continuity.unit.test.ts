import { describe, expect, it } from "vitest";

import { createFluidContinuityEnvelope } from "../src/index.js";

describe("createFluidContinuityEnvelope", () => {
  it("builds a shared continuity contract across all bands", () => {
    const continuity = createFluidContinuityEnvelope({
      fluidBodyId: "harbour-water",
    });

    expect(continuity.continuityGroupId).toBe("harbour-water.continuity");
    expect(continuity.waveFieldId).toBe("harbour-water.wave-field");
    expect(continuity.bands.mid.inheritsFromBand).toBe("near");
    expect(continuity.bands.far.inheritsFromBand).toBe("mid");
    expect(continuity.bands.horizon.inheritsFromBand).toBe("far");
    expect(continuity.bands.mid.amplitudeFloor).toBeGreaterThan(
      continuity.bands.far.amplitudeFloor
    );
    expect(continuity.bands.far.frequencyFloor).toBeGreaterThan(
      continuity.bands.horizon.frequencyFloor
    );
  });

  it("accepts band overrides without losing the shared wave identity", () => {
    const continuity = createFluidContinuityEnvelope({
      fluidBodyId: "bay",
      continuityGroupId: "bay.tides",
      waveFieldId: "bay.shared-waves",
      bands: {
        far: {
          blendWindowMeters: 40,
          amplitudeFloor: 0.4,
        },
      },
    });

    expect(continuity.continuityGroupId).toBe("bay.tides");
    expect(continuity.waveFieldId).toBe("bay.shared-waves");
    expect(continuity.bands.far.blendWindowMeters).toBe(40);
    expect(continuity.bands.far.amplitudeFloor).toBe(0.4);
    expect(continuity.bands.far.retainLowFrequencyWaves).toBe(true);
  });

  it("rejects invalid ratios", () => {
    expect(() =>
      createFluidContinuityEnvelope({
        fluidBodyId: "bad",
        bands: {
          near: {
            amplitudeFloor: 1.5,
          },
        },
      })
    ).toThrow(/must be less than or equal to 1/i);
  });
});
