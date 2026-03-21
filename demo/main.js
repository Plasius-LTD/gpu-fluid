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

function describeState(state, scene) {
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
      `The water surface now advects in a stable travel direction while wakes and collision ripples from the GLTF ships are layered into the same shared wave field.`,
    sceneMetrics: [
      `distance: ${state.distanceMeters.toFixed(1)} m`,
      `band: ${band}`,
      `output: ${representation.output}`,
      `rt: ${representation.rtParticipation}`,
      `wake sources: ${scene.ships.filter((ship) => Math.hypot(ship.velocity.x, ship.velocity.z) > 0.12).length}`,
    ],
    qualityMetrics: [
      `blend window: ${continuityBand.blendWindowMeters} m`,
      `amplitude floor: ${continuityBand.amplitudeFloor.toFixed(2)}`,
      `frequency floor: ${continuityBand.frequencyFloor.toFixed(2)}`,
      `foam history: ${continuityBand.retainFoamHistory ? "retained" : "reduced"}`,
      `directionality: ${continuityBand.retainDirectionality ? "preserved" : "reduced"}`,
    ],
    debugMetrics: [
      `cadence divisor: ${representation.updateCadenceDivisor}x`,
      `shadow mode: ${representation.shadowMode}`,
      `caustics: ${representation.shading.caustics ? "enabled" : "disabled"}`,
      `reflection mode: ${representation.shading.reflectionMode}`,
      `collision ripples: ${scene.waveImpulses.length}`,
    ],
    notes: [
      "This harbor scene uses the local demo asset path, so the package can be served from its own root.",
      "Wave continuity now moves through the scene instead of ping-ponging in place, so near, mid, far, and horizon bands share a drifting wave field.",
      "Ship wakes and collision ripples are folded into the same water surface instead of the fluid ignoring nearby rigid bodies.",
      "Stress mode exaggerates the wave field without breaking the representation contract.",
    ],
    textState: {
      profile: state.profile,
      distanceMeters: Number(state.distanceMeters.toFixed(2)),
      band,
      representation,
      continuityBand,
      wakeSources: scene.ships.filter((ship) => Math.hypot(ship.velocity.x, ship.velocity.z) > 0.12).length,
      collisionRipples: scene.waveImpulses.length,
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
      waveDirection: { x: 0.94, z: 0.34 },
      wavePhaseSpeed: band === "near" ? 1.18 : band === "mid" ? 1.06 : band === "far" ? 0.92 : 0.8,
      wakeStrength: band === "near" ? 0.32 : band === "mid" ? 0.26 : band === "far" ? 0.18 : 0.12,
      wakeLength: band === "near" ? 18 : band === "mid" ? 15 : band === "far" ? 12 : 9,
      collisionRippleStrength: band === "near" ? 0.56 : band === "mid" ? 0.42 : 0.26,
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
