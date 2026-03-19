import { mountGpuShowcase } from "../../gpu-demo-viewer/shared/showcase-runtime.js";

const root = globalThis.document?.getElementById("app");
if (!root) {
  throw new Error("Fluid demo root element was not found.");
}

await mountGpuShowcase({
  root,
  focus: "fluid",
  packageName: "@plasius/gpu-fluid",
  title: "Fluid Continuity in 3D",
  subtitle:
    "The harbor water surface now stays in a real 3D scene, with near, mid, far, and horizon continuity driven by the fluid package contracts.",
});
