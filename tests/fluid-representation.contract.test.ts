import { describe, expect, it } from "vitest";

import {
  createFluidRepresentationPlan,
  selectFluidRepresentationBand,
} from "../src/index.js";

describe("createFluidRepresentationPlan", () => {
  it("creates a continuity-aware plan for all bands", () => {
    const plan = createFluidRepresentationPlan({
      fluidBodyId: "north-sea",
      profile: "interactive",
      supportsRayTracing: true,
    });

    expect(plan.bands).toEqual(["near", "mid", "far", "horizon"]);
    expect(plan.representations).toHaveLength(4);

    const near = plan.representations.find((entry) => entry.band === "near");
    const far = plan.representations.find((entry) => entry.band === "far");
    const horizon = plan.representations.find(
      (entry) => entry.band === "horizon"
    );

    expect(near?.mesh.subdivisions).toBeGreaterThan(far?.mesh.subdivisions ?? 0);
    expect(near?.continuity.waveFieldId).toBe(far?.continuity.waveFieldId);
    expect(far?.continuity.amplitudeFloor).toBeGreaterThan(
      horizon?.continuity.amplitudeFloor ?? 0
    );
    expect(near?.rtParticipation).toBe("full");
    expect(horizon?.rtParticipation).toBe("disabled");
  });

  it("downgrades RT participation when the host does not support it", () => {
    const plan = createFluidRepresentationPlan({
      fluidBodyId: "river-bend",
      supportsRayTracing: false,
    });

    const near = plan.representations.find((entry) => entry.band === "near");
    const mid = plan.representations.find((entry) => entry.band === "mid");

    expect(near?.rtParticipation).toBe("selective");
    expect(mid?.rtParticipation).toBe("proxy");
  });

  it("selects bands from thresholds without gaps", () => {
    const plan = createFluidRepresentationPlan({
      fluidBodyId: "lake",
      nearFieldMaxMeters: 25,
      midFieldMaxMeters: 100,
      farFieldMaxMeters: 400,
    });

    expect(selectFluidRepresentationBand(10, plan.thresholds)).toBe("near");
    expect(selectFluidRepresentationBand(60, plan.thresholds)).toBe("mid");
    expect(selectFluidRepresentationBand(250, plan.thresholds)).toBe("far");
    expect(selectFluidRepresentationBand(800, plan.thresholds)).toBe("horizon");
  });

  it("rejects threshold ordering that would cause popping or ambiguity", () => {
    expect(() =>
      createFluidRepresentationPlan({
        fluidBodyId: "broken",
        nearFieldMaxMeters: 100,
        midFieldMaxMeters: 90,
        farFieldMaxMeters: 500,
      })
    ).toThrow(/must satisfy/i);
  });
});
