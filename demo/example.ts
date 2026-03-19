import {
  createFluidRepresentationPlan,
  createFluidSimulationPlan,
  getFluidWorkerManifest,
  selectFluidRepresentationBand,
} from "../src/index.js";

const representationPlan = createFluidRepresentationPlan({
  fluidBodyId: "atlantic-shelf",
  kind: "ocean",
  profile: "interactive",
  supportsRayTracing: true,
  nearFieldMaxMeters: 40,
  midFieldMaxMeters: 150,
  farFieldMaxMeters: 600,
});

const simulationPlan = createFluidSimulationPlan("interactive");
const workerManifest = getFluidWorkerManifest("interactive");
const band = selectFluidRepresentationBand(180, representationPlan.thresholds);

console.log(
  JSON.stringify(
    {
      plan: {
        fluidBodyId: representationPlan.fluidBodyId,
        bands: representationPlan.bands,
        selectedBand: band,
      },
      selectedRepresentation: representationPlan.representations.find(
        (entry) => entry.band === band
      ),
      simulationStages: simulationPlan.stages.map((stage) => stage.id),
      workerJobs: workerManifest.jobs.map((job) => ({
        id: job.performance.id,
        priority: job.worker.priority,
        dependencies: job.worker.dependencies,
      })),
    },
    null,
    2
  )
);
