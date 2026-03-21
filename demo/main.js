import {
  createFluidContinuityEnvelope,
  createFluidRepresentationPlan,
  defaultFluidProfile,
  selectFluidRepresentationBand,
} from "../dist/index.js";
import { mountHarborShowcase } from "./harbor-runtime.js";

const root = globalThis.document?.getElementById("app");
if (!root) {
  throw new Error("Fluid demo root element was not found.");
}

function createState() {
  return {
    profile: defaultFluidProfile,
    distanceMeters: 20,
  };
}

function updateState(state, scene) {
  return {
    ...state,
    distanceMeters: 20 + ((Math.sin(scene.time * 0.18) + 1) * 0.5) * 240,
  };
}

function describeState(state) {
  const plan = createFluidRepresentationPlan({
    fluidBodyId: "harbor",
    kind: "ocean",
    profile: state.profile,
    supportsRayTracing: true,
    nearFieldMaxMeters: 40,
    midFieldMaxMeters: 150,
    farFieldMaxMeters: 600,
  });
  const band = selectFluidRepresentationBand(state.distanceMeters, plan.thresholds);
  const representation =
    plan.representations.find((entry) => entry.band === band) ?? plan.representations[0];
  const continuity = createFluidContinuityEnvelope({ fluidBodyId: "harbor" });
  const continuityBand = continuity.bands[band];

  return {
    status: `Fluid live · ${band} band · ${representation.output}`,
    details:
      `The water surface keeps a continuous wave field while the fluid package swaps from live surface detail to simplified and proxy representations.`,
    sceneMetrics: [
      `distance: ${state.distanceMeters.toFixed(1)} m`,
      `band: ${band}`,
      `output: ${representation.output}`,
      `rt: ${representation.rtParticipation}`,
    ],
    qualityMetrics: [
      `blend window: ${continuityBand.blendWindowMeters} m`,
      `amplitude floor: ${continuityBand.amplitudeFloor.toFixed(2)}`,
      `frequency floor: ${continuityBand.frequencyFloor.toFixed(2)}`,
      `foam history: ${continuityBand.retainFoamHistory ? "retained" : "reduced"}`,
    ],
    debugMetrics: [
      `cadence divisor: ${representation.updateCadenceDivisor}x`,
      `shadow mode: ${representation.shadowMode}`,
      `caustics: ${representation.shading.caustics ? "enabled" : "disabled"}`,
      `reflection mode: ${representation.shading.reflectionMode}`,
    ],
    notes: [
      "This harbor scene uses the local demo asset path, so the package can be served from its own root.",
      "Wave continuity stays visible as the active representation crosses near, mid, far, and horizon ranges.",
      "Stress mode exaggerates the wave field without breaking the representation contract.",
    ],
    textState: {
      profile: state.profile,
      distanceMeters: Number(state.distanceMeters.toFixed(2)),
      band,
      representation,
      continuityBand,
    },
    visuals: {
      waveAmplitude:
        band === "near"
          ? continuityBand.amplitudeFloor
          : band === "mid"
            ? continuityBand.amplitudeFloor * 0.92
            : band === "far"
              ? continuityBand.amplitudeFloor * 0.8
              : continuityBand.amplitudeFloor * 0.68,
      flagMotion: 0.52,
      reflectionStrength: representation.shading.reflectionMode === "full" ? 0.24 : 0.12,
      shadowAccent: representation.shadowMode === "ray-traced-primary" ? 0.08 : 0.04,
      waterNear: { r: 0.12, g: 0.41, b: 0.52 },
      waterFar: { r: 0.28, g: 0.56, b: 0.68 },
      seaTop: "#214f65",
      seaMid: "#103d54",
      seaBottom: "#082232",
      skyTop: "#edf6fb",
      skyMid: "#bed3e0",
      skyBottom: "#7ca2b5",
      sunCore: "rgba(248, 242, 218, 0.9)",
    },
  };
}

await mountHarborShowcase({
  root,
  packageName: "@plasius/gpu-fluid",
  title: "Fluid Continuity in a 3D Harbor",
  subtitle:
    "Package-local 3D validation for wave continuity and representation bands, with the harbor surface staying coherent around the colliding GLTF ships.",
  createState,
  updateState,
  describeState,
});
